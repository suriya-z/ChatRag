type DemoEnv = {
  NODE_ENV?: string;
  NEXT_PUBLIC_DEMO_MODE?: string;
};

export const DEMO_USER_STORAGE_KEY = 'chatrag_mock_user';

export function isDemoLoginAllowed(
  envVars: DemoEnv = {
    NODE_ENV: process.env.NODE_ENV,
    NEXT_PUBLIC_DEMO_MODE: process.env.NEXT_PUBLIC_DEMO_MODE,
  }
): boolean {
  return envVars.NODE_ENV === 'development' || envVars.NEXT_PUBLIC_DEMO_MODE === 'true';
}
