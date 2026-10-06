import type { Messages } from '../../types-messages';
import { common } from './common';
import { settings } from './settings';
import { routes } from './routes';
import { table } from './table';
import { ui } from './ui';
import { codex } from './codex';
import { infra } from './infra';

export const it: Messages = { common, settings, routes, table, ui, codex, infra };
