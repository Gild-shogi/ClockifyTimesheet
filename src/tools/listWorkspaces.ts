#!/usr/bin/env ts-node

import axios from 'axios';
import * as dotenv from 'dotenv';

dotenv.config();

interface Workspace {
  id: string;
  name: string;
  hourlyRate: {
    amount: number;
    currency: string;
  };
  memberships: Array<{
    userId: string;
    hourlyRate?: {
      amount: number;
      currency: string;
    };
    costRate?: {
      amount: number;
      currency: string;
    };
    targetId: string;
    membershipType: string;
    membershipStatus: string;
  }>;
  workspaceSettings: {
    timeRoundingSettings: {
      roundingInterval: string;
      roundingType: string;
    };
    onlyAdminsSeeBillableRates: boolean;
    onlyAdminsCreateProject: boolean;
    onlyAdminsSeeDashboard: boolean;
    defaultBillableProjects: boolean;
    lockTimeEntries?: string;
    round: {
      round: string;
      minutes: string;
    };
    projectFavorites: boolean;
    canSeeTimeSheet: boolean;
    canSeeTracker: boolean;
    projectPickerSpecialFilter: boolean;
    forceProjects: boolean;
    forceTasks: boolean;
    forceDescription: boolean;
    onlyAdminsCreateTag: boolean;
    onlyAdminsCreateTask: boolean;
    timeTrackingMode: string;
    isProjectPublicByDefault: boolean;
  };
  imageUrl: string;
  featureSubscriptionType?: string;
}

async function listWorkspaces(): Promise<void> {
  const apiKey = process.env.CLOCKIFY_API_KEY;

  if (!apiKey) {
    console.error('エラー: CLOCKIFY_API_KEY環境変数が設定されていません。');
    console.error('.envファイルでCLOCKIFY_API_KEYを設定してください。');
    process.exit(1);
  }

  try {
    console.log('ワークスペース一覧を取得中...\n');

    const response = await axios.get('https://api.clockify.me/api/v1/workspaces', {
      headers: {
        'X-Api-Key': apiKey,
        'Content-Type': 'application/json',
      },
    });

    const workspaces: Workspace[] = response.data;

    if (workspaces.length === 0) {
      console.log('ワークスペースが見つかりませんでした。');
      return;
    }

    console.log(`${workspaces.length}個のワークスペースが見つかりました:\n`);
    console.log('━'.repeat(80));
    console.log(`${'ID'.padEnd(25)} | ワークスペース名`);
    console.log('━'.repeat(80));

    workspaces.forEach((workspace, index) => {
      console.log(`${workspace.id.padEnd(25)} | ${workspace.name}`);
    });

    console.log('━'.repeat(80));
    console.log('\n設定方法:');
    console.log('CLOCKIFY_WORKSPACE_ID=<上記のIDをコピー>');
    console.log('\n例:');
    console.log(`CLOCKIFY_WORKSPACE_ID=${workspaces[0].id}`);
  } catch (error: any) {
    console.error('エラーが発生しました:');
    if (error.response) {
      console.error(`ステータス: ${error.response.status}`);
      console.error(`メッセージ: ${error.response.data?.message || error.response.statusText}`);

      if (error.response.status === 401) {
        console.error('\nAPIキーが無効です。正しいAPIキーを設定してください。');
        console.error('APIキーの取得方法: https://clockify.me/user/settings');
      }
    } else {
      console.error(error.message);
    }
    process.exit(1);
  }
}

if (require.main === module) {
  listWorkspaces();
}
