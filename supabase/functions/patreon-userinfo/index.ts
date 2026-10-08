// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import { handlePatreonUserinfo } from './handler.ts'

export default { fetch: (request: Request) => handlePatreonUserinfo(request) }
