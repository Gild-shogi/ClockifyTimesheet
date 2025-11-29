#!/usr/bin/env ts-node

import axios from 'axios';
import * as dotenv from 'dotenv';

dotenv.config();

interface User {
  id: string;
  email: string;
  name: string;
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
  profilePicture: string;
  activeWorkspace: string;
  defaultWorkspace: string;
  settings: {
    weekStart: string;
    timeZone: string;
    timeFormat: string;
    dateFormat: string;
    sendNewsletter: boolean;
    weeklyUpdates: boolean;
    longRunning: boolean;
    scheduledReports: boolean;
    approval: boolean;
    pto: boolean;
    alerts: boolean;
    reminders: boolean;
    timeTrackingManual: boolean;
    summaryReportSettings: {
      summaryReportSettings: string;
      summaryReportPins: string;
    };
    isCompactViewOn: boolean;
    dashboardSelection: string;
    dashboardViewType: string;
    dashboardPinToTop: boolean;
    projectListCollapse: number;
    collapseAllProjectLists: boolean;
    groupSimilarEntriesDisabled: boolean;
    myStartOfDay: string;
    projectPickerTaskFilter: boolean;
    lang: string;
    multiFactorEnabled: boolean;
    theme: string;
    scheduling: boolean;
  };
  status: string;
}

async function getCurrentUserInfo(): Promise<User> {
  const apiKey = process.env.CLOCKIFY_API_KEY;

  if (!apiKey) {
    console.error('エラー: CLOCKIFY_API_KEY環境変数が設定されていません。');
    console.error('.envファイルでCLOCKIFY_API_KEYを設定してください。');
    process.exit(1);
  }

  try {
    const response = await axios.get('https://api.clockify.me/api/v1/user', {
      headers: {
        'X-Api-Key': apiKey,
        'Content-Type': 'application/json',
      },
    });

    return response.data;
  } catch (error: any) {
    console.error('ユーザー情報の取得に失敗しました:');
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

async function searchUserByEmail(workspaceId: string, email: string): Promise<User | null> {
  const apiKey = process.env.CLOCKIFY_API_KEY;

  if (!apiKey) {
    return null;
  }

  try {
    const response = await axios.get(
      `https://api.clockify.me/api/v1/workspaces/${workspaceId}/users`,
      {
        headers: {
          'X-Api-Key': apiKey,
          'Content-Type': 'application/json',
        },
        params: {
          email: email,
          'page-size': 1000,
        },
      }
    );

    const users: User[] = response.data;
    return users.find((user) => user.email.toLowerCase() === email.toLowerCase()) || null;
  } catch (error) {
    console.error('ユーザー検索に失敗しました:', error);
    return null;
  }
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);

  if (args.length > 0) {
    // 引数がある場合はメールアドレス検索
    const email = args[0];
    const workspaceId = process.env.CLOCKIFY_WORKSPACE_ID;

    if (!workspaceId) {
      console.error('エラー: CLOCKIFY_WORKSPACE_ID環境変数が設定されていません。');
      console.error('先にワークスペースIDを設定するか、listWorkspaces.tsを実行してください。');
      process.exit(1);
    }

    console.log(`メールアドレス "${email}" でユーザーを検索中...\n`);

    const user = await searchUserByEmail(workspaceId, email);

    if (user) {
      console.log('ユーザーが見つかりました:');
      console.log('━'.repeat(50));
      console.log(`ユーザーID: ${user.id}`);
      console.log(`名前: ${user.name}`);
      console.log(`メール: ${user.email}`);
      console.log(`タイムゾーン: ${user.settings.timeZone}`);
      console.log('━'.repeat(50));
      console.log('\n設定方法:');
      console.log(`CLOCKIFY_USER_ID=${user.id}`);
    } else {
      console.log(`メールアドレス "${email}" のユーザーが見つかりませんでした。`);
      console.log('ワークスペースに参加していない可能性があります。');
    }
  } else {
    // 引数がない場合は現在のユーザー情報を表示
    console.log('現在のユーザー情報を取得中...\n');

    const user = await getCurrentUserInfo();

    console.log('現在のユーザー情報:');
    console.log('━'.repeat(50));
    console.log(`ユーザーID: ${user.id}`);
    console.log(`名前: ${user.name}`);
    console.log(`メール: ${user.email}`);
    console.log(`アクティブワークスペース: ${user.activeWorkspace}`);
    console.log(`デフォルトワークスペース: ${user.defaultWorkspace}`);
    console.log(`タイムゾーン: ${user.settings.timeZone}`);
    console.log(`言語: ${user.settings.lang}`);
    console.log('━'.repeat(50));
    console.log('\n設定方法:');
    console.log(`CLOCKIFY_USER_ID=${user.id}`);
    console.log(`CLOCKIFY_WORKSPACE_ID=${user.activeWorkspace}`);
  }
}

if (require.main === module) {
  main();
}
