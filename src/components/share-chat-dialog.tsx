import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { useShareChat } from '@/hooks/useShareChat';
import { Loader2, Copy, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/components/providers/language-provider';

interface ShareChatDialogProps {
  chatId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ShareChatDialog({ chatId, open, onOpenChange }: ShareChatDialogProps) {
  const { shareChat, isLoading, error } = useShareChat();
  const { toast } = useToast();
  const { t } = useLanguage();
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleShare = async () => {
    try {
      const { shareUrl } = await shareChat(chatId);
      setShareUrl(shareUrl);
    } catch (err) {
      toast({
        title: 'Error',
        description: error || 'Failed to share chat',
        variant: 'destructive',
      });
    }
  };

  const copyToClipboard = async () => {
    if (shareUrl) {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({
        title: 'Success',
        description: 'Share link copied to clipboard',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn(
        "sm:max-w-md",
        "bg-[#090a0f] border border-[#1a1c24]",
        "border border-[#E0D5C9] dark:border-[#3A3A3A]",
        "shadow-lg",
        "backdrop-blur-none"
      )}>
        <DialogHeader>
          <DialogTitle>{t('shareChatTitle')}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4 py-4">
          {!shareUrl && (
            <Button
              onClick={handleShare}
              disabled={isLoading}
              className="w-full bg-white text-black hover:bg-[#38bdf8] hover:text-black font-semibold rounded-[4px] uppercase text-xs font-mono tracking-wider"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t('generatingLink')}
                </>
              ) : (
                t('generateShareLink')
              )}
            </Button>
          )}
          
          {shareUrl && (
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={shareUrl}
                className="flex-1 px-3 py-2 text-sm border rounded-md bg-[#FFF0E8] dark:bg-[#1A1A1A] border-[#E0D5C9] dark:border-[#3A3A3A] text-gray-900 dark:text-white"
              />
              <Button
                size="icon"
                variant="outline"
                onClick={copyToClipboard}
                className="bg-white text-black hover:bg-[#38bdf8] hover:text-black font-semibold rounded-[4px] uppercase text-xs font-mono tracking-wider"
              >
                {copied ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
          )}

          {error && (
            <p className="text-sm text-red-500">{error}</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
} 