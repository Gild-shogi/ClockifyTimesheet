import * as dotenv from 'dotenv';

dotenv.config();

export interface Config {
  clockify: {
    apiKey: string;
    workspaceId: string;
    userId: string;
  };
}

export function loadConfig(): Config {
  const apiKey = process.env.CLOCKIFY_API_KEY;
  const workspaceId = process.env.CLOCKIFY_WORKSPACE_ID;
  const userId = process.env.CLOCKIFY_USER_ID;

  if (!apiKey || !workspaceId || !userId) {
    console.error('環境変数を設定してください:');
    console.error('CLOCKIFY_API_KEY: ClockifyのAPIキー');
    console.error('CLOCKIFY_WORKSPACE_ID: ワークスペースID');
    console.error('CLOCKIFY_USER_ID: ユーザーID');
    process.exit(1);
  }

  return {
    clockify: {
      apiKey,
      workspaceId,
      userId,
    },
  };
}
