import { apis, baseURL } from "../constants/apis.constant";
import APIClient from "../lib/api-client";
import AppError from "../lib/app-error";
import { withValidation } from "../lib/with-validation";
import { EventResult, TopsortEvent } from "../types/events";
import { Config } from "../types/shared";

async function handler(event: TopsortEvent, config: Config): Promise<EventResult> {
  try {
    const url = `${config.host}/${apis.events}`;
    await APIClient.post(url, event, config);

    return { ok: true, retry: false };
  } catch (error) {
    if (error instanceof AppError && error.retry) {
      return { ok: false, retry: true };
    }
    throw error;
  }
}

export const reportEvent = withValidation(handler);
