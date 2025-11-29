import { TimesheetRow, TimesheetTable, WorkDay } from '../types';

export interface TableBuilderOptions {
  showDescription: boolean;
}

/**
 * WorkDay[]から共通のテーブルデータ構造を生成する
 * Excel、CSV、Google Sheets等の出力形式で共有される
 */
export class TimesheetTableBuilder {
  build(
    workDays: WorkDay[],
    year: number,
    month: number,
    options: TableBuilderOptions
  ): TimesheetTable {
    const headers = this.buildHeaders(options);
    const rows: TimesheetRow[] = [];
    let totalHours = 0;
    let dateGroupIndex = 0;

    for (const workDay of workDays) {
      if (workDay.sessions.length === 0) continue;

      for (let i = 0; i < workDay.sessions.length; i++) {
        const session = workDay.sessions[i];
        const isFirstSession = i === 0;

        const [, m, d] = session.date.split('-');

        rows.push({
          date: isFirstSession ? `${m}/${d}` : '',
          dayOfWeek: isFirstSession ? workDay.dayOfWeek : '',
          projectName: session.projectName,
          description: session.description || '',
          startTime: session.startTime,
          endTime: session.endTime,
          workHoursFormatted: this.formatWorkHoursAsTime(session.workHours),
          workHoursDecimal: session.workHours.toFixed(2),
          dateGroupIndex,
        });

        totalHours += session.workHours;
      }

      dateGroupIndex++;
    }

    // 合計行を追加
    rows.push({
      date: '合計',
      dayOfWeek: '',
      projectName: '',
      description: '',
      startTime: '',
      endTime: '',
      workHoursFormatted: this.formatWorkHoursAsTime(totalHours),
      workHoursDecimal: totalHours.toFixed(2),
      isTotal: true,
    });

    return {
      headers,
      rows,
      totalHours,
      workDayCount: dateGroupIndex,
      year,
      month,
    };
  }

  private buildHeaders(options: TableBuilderOptions): string[] {
    const headers = ['日付', '曜日', 'プロジェクト'];
    if (options.showDescription) {
      headers.push('作業内容');
    }
    headers.push('出勤時刻', '退勤時刻', '労働時間', '労働時間(h)');
    return headers;
  }

  private formatWorkHoursAsTime(hours: number): string {
    const totalMinutes = Math.round(hours * 60);
    const h = Math.floor(totalMinutes / 60);
    const min = totalMinutes % 60;
    return `${h}:${min.toString().padStart(2, '0')}`;
  }

  /**
   * テーブル行を配列形式に変換（CSV等で使用）
   */
  rowToArray(row: TimesheetRow, options: TableBuilderOptions): string[] {
    const values = [row.date, row.dayOfWeek, row.projectName];
    if (options.showDescription) {
      values.push(row.description);
    }
    values.push(row.startTime, row.endTime, row.workHoursFormatted, row.workHoursDecimal);
    return values;
  }
}
