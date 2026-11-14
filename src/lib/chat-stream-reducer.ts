export interface StreamState {
  accumulator: string;
  fullStreamedContent: string;
}

export interface ChatStreamContext {
  streamState: StreamState;
  streamingMessage: { content: any };
  streamingContentRef: { current: string };
  toolCallNameById: Map<string, string>;
  updateStreamingText: (text: string) => void;
  handleDocumentReference: (text: string) => void;
  commitStreamingMessage: () => void;
  applyDocumentReferencesFromMetadata: (docs: any) => void;
}

/** Reduce one chat stream event into message parts. The page passes mutable state and commits. */
export function handleChatStreamEvent(event: any, ctx: ChatStreamContext): void {
  const {
    streamState,
    streamingMessage,
    streamingContentRef,
    toolCallNameById,
    updateStreamingText,
    handleDocumentReference,
    commitStreamingMessage,
    applyDocumentReferencesFromMetadata
  } = ctx;

  streamState.accumulator += JSON.stringify(event) + '\n';

  switch (event.type) {
    case 'text-start': {
      streamState.fullStreamedContent = '';
      updateStreamingText('');
      break;
    }
    case 'text-delta': {
      if (typeof event.delta === 'string') {
        streamState.fullStreamedContent += event.delta;
        updateStreamingText(streamState.fullStreamedContent);
        handleDocumentReference(streamState.fullStreamedContent);
      }
      break;
    }
    case 'text-end': {
      if (typeof event.text === 'string') {
        streamState.fullStreamedContent += event.text;
        updateStreamingText(streamState.fullStreamedContent);
        handleDocumentReference(streamState.fullStreamedContent);
      }
      break;
    }
    case 'generated_image': {
      console.log('[Stream] Received generated_image event:', event);
      if (event.generated_images && Array.isArray(event.generated_images)) {
        if (Array.isArray(streamingMessage.content)) {
          streamingMessage.content.push({
            type: 'generated_image',
            generated_images: event.generated_images,
            aspectRatio: event.aspectRatio || 'auto',
            sourceImageUrl: event.sourceImageUrl
          });
        } else {
          streamingMessage.content = [
            { type: 'text', text: streamingMessage.content || streamState.fullStreamedContent },
            {
              type: 'generated_image',
              generated_images: event.generated_images,
              aspectRatio: event.aspectRatio || 'auto',
              sourceImageUrl: event.sourceImageUrl
            }
          ];
        }
        commitStreamingMessage();
        console.log('[Stream] Added generated image to message content');
      }
      break;
    }
    case 'source_images': {
      console.log('[Stream] Received source_images event:', event);
      if (event.source_images && Array.isArray(event.source_images) && event.source_images.length > 0) {
        const sourceImagesPart = {
          type: 'source_images',
          source_images: event.source_images
        };

        if (Array.isArray(streamingMessage.content)) {
          const existingPart = streamingMessage.content.find((part: any) => part.type === 'source_images');
          if (existingPart) {
            existingPart.source_images = event.source_images;
          } else {
            streamingMessage.content.unshift(sourceImagesPart);
          }
        } else {
          streamingMessage.content = [
            sourceImagesPart,
            { type: 'text', text: streamingContentRef.current || '' }
          ];
        }

        commitStreamingMessage();
        console.log('[Stream] Added source_images to message content:', event.source_images.length, 'images');
      }
      break;
    }
    case 'metadata':
    case 'response-metadata': {
      if (event.metadata?.usedDocuments) {
        applyDocumentReferencesFromMetadata(event.metadata.usedDocuments);
      }
      if (event.metadata?.documentSources) {
        applyDocumentReferencesFromMetadata(event.metadata.documentSources);
      }
      if (event.usedDocuments && Array.isArray(event.usedDocuments)) {
        const imagesFromDocs = event.usedDocuments
          .filter((doc: any) => doc.image_url)
          .map((doc: any) => ({
            name: doc.name || doc.filename || 'Source Image',
            size: 0,
            type: 'image/jpeg',
            url: doc.image_url
          }));
        if (imagesFromDocs.length > 0) {
          console.log('[Stream] Extracted images from metadata usedDocuments:', imagesFromDocs.length);
          const sourceImagesPart = {
            type: 'source_images',
            source_images: imagesFromDocs
          };
          if (Array.isArray(streamingMessage.content)) {
            const existingPart = streamingMessage.content.find((part: any) => part.type === 'source_images');
            if (!existingPart) {
              streamingMessage.content.push(sourceImagesPart);
              commitStreamingMessage();
            }
          }
        }
      }

      const webSearchMeta = event.metadata?.webSearch;
      if (webSearchMeta) {
        const resultsPayload = Array.isArray(webSearchMeta)
          ? webSearchMeta
          : Array.isArray((webSearchMeta as any).results)
            ? (webSearchMeta as any).results
            : Array.isArray((webSearchMeta as any).items)
              ? (webSearchMeta as any).items
              : Array.isArray((webSearchMeta as any).results?.results)
                ? (webSearchMeta as any).results.results
                : Array.isArray((webSearchMeta as any).results?.items)
                  ? (webSearchMeta as any).results.items
                  : Array.isArray((webSearchMeta as any).results)
                    ? (webSearchMeta as any).results
                    : [];

        if (resultsPayload.length > 0) {
          if (process.env.NODE_ENV === 'development') {
            console.log('[Stream] webSearch metadata results:', {
              count: resultsPayload.length,
              toolCallId: (webSearchMeta as any).toolCallId
            });
          }
          const toolCallId = (webSearchMeta as any).toolCallId || `webSearch-${Date.now()}`;
          const toolResultPart = {
            type: 'tool-result',
            toolName: 'webSearch',
            toolCallId,
            output: resultsPayload
          };

          if (Array.isArray(streamingMessage.content)) {
            const existingPart = streamingMessage.content.find(
              (part: any) =>
                (part.type === 'tool-result' || part.type === 'tool_result') &&
                part.toolCallId === toolCallId
            );
            if (existingPart) {
              Object.assign(existingPart, toolResultPart);
            } else {
              streamingMessage.content.push(toolResultPart);
            }
          } else {
            streamingMessage.content = [
              { type: 'text', text: streamingContentRef.current || '' },
              toolResultPart
            ];
          }

          commitStreamingMessage();
        }
      }
      break;
    }
    case 'tool-result': {
      if (process.env.NODE_ENV === 'development') {
        const toolName = (event as any).toolName;
        const toolCallId = (event as any).toolCallId;
        const result = (event as any).result;
        const output = (event as any).output;
        const outputValue = output && typeof output === 'object' && 'value' in output ? (output as any).value : output;
        const resultKeys = result && typeof result === 'object' ? Object.keys(result as object) : [];
        const resultCount = Array.isArray(result) ? result.length : Array.isArray(result?.results) ? result.results.length : undefined;
        const outputKeys = output && typeof output === 'object' ? Object.keys(output as object) : [];
        const outputValueKeys = outputValue && typeof outputValue === 'object' ? Object.keys(outputValue as object) : [];
        const outputCount = Array.isArray(outputValue)
          ? outputValue.length
          : Array.isArray((outputValue as any)?.results)
            ? (outputValue as any).results.length
            : Array.isArray((outputValue as any)?.items)
              ? (outputValue as any).items.length
              : undefined;
        console.log('[Stream] tool-result event:', {
          toolName,
          toolCallId,
          resultKeys,
          resultCount,
          outputKeys,
          outputValueKeys,
          outputCount
        });
      }
      const toolResultPart = {
        type: 'tool-result',
        toolName: (event as any).toolName,
        toolCallId: (event as any).toolCallId,
        result: (event as any).result,
        output: (event as any).output,
        isError: (event as any).isError
      };

      if (Array.isArray(streamingMessage.content)) {
        const existingPart = streamingMessage.content.find(
          (part: any) =>
            (part.type === 'tool-result' || part.type === 'tool_result') &&
            part.toolCallId === toolResultPart.toolCallId
        );
        if (existingPart) {
          Object.assign(existingPart, toolResultPart);
        } else {
          streamingMessage.content.push(toolResultPart);
        }
      } else {
        streamingMessage.content = [
          { type: 'text', text: streamingContentRef.current || '' },
          toolResultPart
        ];
      }
      commitStreamingMessage();

      if (event.result?.usedDocuments) {
        applyDocumentReferencesFromMetadata(event.result.usedDocuments);
      } else if (event.output?.usedDocuments) {
        applyDocumentReferencesFromMetadata(event.output.usedDocuments);
      } else if (event.output?.value?.usedDocuments) {
        applyDocumentReferencesFromMetadata(event.output.value.usedDocuments);
      }
      break;
    }
    case 'tool-input-available': {
      const toolCallId = (event as any).toolCallId;
      const toolName = (event as any).toolName;
      if (toolCallId && toolName) {
        toolCallNameById.set(toolCallId, toolName);
      }
      break;
    }
    case 'tool-output-available': {
      const toolCallId = (event as any).toolCallId;
      const toolName = toolCallId ? toolCallNameById.get(toolCallId) : undefined;
      if (process.env.NODE_ENV === 'development') {
        const output = (event as any).output;
        const outputCount = Array.isArray(output)
          ? output.length
          : Array.isArray(output?.results)
            ? output.results.length
            : Array.isArray(output?.items)
              ? output.items.length
              : undefined;
        console.log('[Stream] tool-output-available:', { toolCallId, toolName, outputCount });
      }
      const toolResultPart = {
        type: 'tool-result',
        toolName,
        toolCallId,
        output: (event as any).output
      };

      if (Array.isArray(streamingMessage.content)) {
        const existingPart = streamingMessage.content.find(
          (part: any) =>
            (part.type === 'tool-result' || part.type === 'tool_result') &&
            part.toolCallId === toolCallId
        );
        if (existingPart) {
          Object.assign(existingPart, toolResultPart);
        } else {
          streamingMessage.content.push(toolResultPart);
        }
      } else {
        streamingMessage.content = [
          { type: 'text', text: streamingContentRef.current || '' },
          toolResultPart
        ];
      }
      commitStreamingMessage();
      break;
    }
    case 'error': {
      console.error('Stream error event:', event);
      break;
    }
    case 'finish':
    case 'step-finish':
    case 'message-annotations':
    case 'tool-call':
    case 'tool-call-streaming-start':
    case 'tool-call-delta': {
      break;
    }
    default: {
      const knownButUnhandled = ['finish', 'step-finish', 'message-annotations', 'tool-call', 'tool-call-streaming-start', 'tool-call-delta'];
      if (process.env.NODE_ENV === 'development' && !knownButUnhandled.includes(event.type)) {
        console.log('[Stream] Unknown SSE event type:', event.type, event);
      }
      break;
    }
  }
}
