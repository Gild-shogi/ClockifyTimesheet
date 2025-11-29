/**
 * TimesheetService.convertToUTC のテスト
 *
 * 実行方法:
 *   pnpm test
 *   TZ=UTC pnpm test
 *   TZ=America/New_York pnpm test
 *
 * ホストOSのタイムゾーンに関係なく、同じ結果が得られることを確認する
 */

import { TimesheetService } from '../services/timesheetService';
import { IConfigurationService } from '../interfaces';

// テスト用のモックConfigurationService
const createMockConfigService = (timezone: string): IConfigurationService => ({
  getTimezone: () => timezone,
  getClockifyConfig: () => ({ apiKey: '', workspaceId: '', userId: '' }),
  getExcelSettings: () => ({
    headerColor: '',
    borderStyle: 'thin' as const,
    fontSize: 11,
    fontName: '',
    dateGroupBorder: { style: 'thin' as const, color: '' },
  }),
});

// プライベートメソッドにアクセスするためのヘルパー
function getConvertToUTC(timezone: string) {
  const mockConfigService = createMockConfigService(timezone);
  const service = new TimesheetService(
    null as any,
    null as any,
    null as any,
    mockConfigService
  );
  return (service as any)['convertToUTC'].bind(service);
}

interface TestCase {
  name: string;
  input: { year: number; month: number; day: number; hour: number; minute: number; second: number };
  timezone: string;
  expected: string;
}

const testCases: TestCase[] = [
  // Asia/Tokyo (UTC+9)
  {
    name: 'JST 2024-01-01 00:00:00 → UTC',
    input: { year: 2024, month: 1, day: 1, hour: 0, minute: 0, second: 0 },
    timezone: 'Asia/Tokyo',
    expected: '2023-12-31T15:00:00.000Z',
  },
  {
    name: 'JST 2024-01-31 23:59:59 → UTC',
    input: { year: 2024, month: 1, day: 31, hour: 23, minute: 59, second: 59 },
    timezone: 'Asia/Tokyo',
    expected: '2024-01-31T14:59:59.000Z',
  },
  {
    name: 'JST 2024-12-01 00:00:00 → UTC',
    input: { year: 2024, month: 12, day: 1, hour: 0, minute: 0, second: 0 },
    timezone: 'Asia/Tokyo',
    expected: '2024-11-30T15:00:00.000Z',
  },
  {
    name: 'JST 2024-12-31 23:59:59 → UTC',
    input: { year: 2024, month: 12, day: 31, hour: 23, minute: 59, second: 59 },
    timezone: 'Asia/Tokyo',
    expected: '2024-12-31T14:59:59.000Z',
  },
  // UTC (オフセットなし)
  {
    name: 'UTC 2024-01-01 00:00:00 → UTC',
    input: { year: 2024, month: 1, day: 1, hour: 0, minute: 0, second: 0 },
    timezone: 'UTC',
    expected: '2024-01-01T00:00:00.000Z',
  },
  // America/New_York (UTC-5 / UTC-4 DST)
  {
    name: 'EST 2024-01-01 00:00:00 → UTC (冬時間 UTC-5)',
    input: { year: 2024, month: 1, day: 1, hour: 0, minute: 0, second: 0 },
    timezone: 'America/New_York',
    expected: '2024-01-01T05:00:00.000Z',
  },
  {
    name: 'EDT 2024-07-01 00:00:00 → UTC (夏時間 UTC-4)',
    input: { year: 2024, month: 7, day: 1, hour: 0, minute: 0, second: 0 },
    timezone: 'America/New_York',
    expected: '2024-07-01T04:00:00.000Z',
  },
];

let passed = 0;
let failed = 0;

console.log(`\nconvertToUTC テスト (ホストTZ: ${process.env.TZ || 'システムデフォルト'})\n`);
console.log('='.repeat(70));

for (const tc of testCases) {
  const convertToUTC = getConvertToUTC(tc.timezone);
  const { year, month, day, hour, minute, second } = tc.input;
  const result = convertToUTC(year, month, day, hour, minute, second, tc.timezone);

  if (result === tc.expected) {
    console.log(`✓ ${tc.name}`);
    passed++;
  } else {
    console.log(`✗ ${tc.name}`);
    console.log(`  期待値: ${tc.expected}`);
    console.log(`  実際値: ${result}`);
    failed++;
  }
}

console.log('='.repeat(70));
console.log(`\n結果: ${passed} passed, ${failed} failed\n`);

if (failed > 0) {
  process.exit(1);
}
