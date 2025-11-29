# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Clockify勤務表自動生成ツール - A TypeScript application that generates monthly Excel timesheets from Clockify time entries. Handles overnight work sessions that span multiple days.

## Common Commands

```bash
pnpm install          # Install dependencies
pnpm start            # Generate current month's timesheet
pnpm build            # Compile TypeScript
pnpm lint             # Run Biome linter
pnpm format           # Format code with Biome
pnpm check            # Run Biome check (lint + format)
pnpm list-workspaces  # List Clockify workspaces (requires API key in .env)
pnpm get-user-info    # Get Clockify user info
```

## Architecture

The codebase uses a dependency injection pattern with interface-based design:

**Core Interfaces** (`src/interfaces.ts`):
- `ITimeTrackingClient` - Clockify API operations
- `ITimesheetGenerator` - Excel file generation
- `IDataProcessor` - Transform time entries into work days
- `IConfigurationService` - Environment/settings access
- `ITimesheetService` - Main orchestration service

**DI Container** (`src/container.ts`):
- Manages service instantiation and dependency wiring
- Services receive dependencies via constructor injection

**Service Layer** (`src/services/`):
- `ConfigurationService` - Reads from environment variables
- `ClockifyTimeTrackingClient` - Wraps Clockify REST API
- `TimeEntryDataProcessor` - Processes entries, handles date-spanning sessions
- `ExcelTimesheetGenerator` - Creates formatted Excel output using exceljs
- `TimesheetService` - Coordinates the full generation workflow

**Legacy Code**: `src/clockifyClient.ts` and `src/excelGenerator.ts` are kept for backwards compatibility but new code should use the service layer.

## Key Data Flow

1. `TimesheetService.generateMonthlyTimesheet()` orchestrates the process
2. Time entries fetched from Clockify API (UTC timestamps)
3. `DataProcessor` converts to local timezone, splits overnight sessions
4. `ExcelTimesheetGenerator` outputs formatted .xlsx file

## Configuration

Environment variables in `.env`:
- `CLOCKIFY_API_KEY`, `CLOCKIFY_WORKSPACE_ID`, `CLOCKIFY_USER_ID` - Required
- `TIMEZONE` - For time conversion (default: Asia/Tokyo)
- `EXCEL_*` - Optional styling settings (colors, fonts, borders)

## Code Style

- Biome for linting/formatting (single quotes, semicolons, 2-space indent)
- TypeScript strict mode enabled
- Japanese comments and UI strings
