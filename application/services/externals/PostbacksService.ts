import assert, { AssertionError } from 'assert';
import NetworkService from './helpers/NetworkServiceV2';

const {
  env: { POSTBACKS_BASE_URL, POSTBACKS_CLIENT_KEY, ORDER_REQUEST_SERVICE_BASE_URL },
} = process;

assert.ok(POSTBACKS_BASE_URL, 'Missing POSTBACKS_BASE_URL in environment variables');
assert.ok(POSTBACKS_CLIENT_KEY, 'Missing POSTBACKS_CLIENT_KEY in environment variables');
assert.ok(ORDER_REQUEST_SERVICE_BASE_URL, 'Missing ORDER_REQUEST_SERVICE_BASE_URL in environment variables');

class PostbacksServiceClass {
  #_POSTBACKS_BASE_URL = POSTBACKS_BASE_URL;

  #_POSTBACKS_CLIENT_KEY = POSTBACKS_CLIENT_KEY;

  #_networkService: NetworkService;

  constructor() {
    if (!this.#_POSTBACKS_BASE_URL) {
      throw new AssertionError({ message: 'Missing POSTBACKS_BASE_URL in environment variables' });
    }
    this.#_networkService = new NetworkService(this.#_POSTBACKS_BASE_URL, 'PostbacksService');
    this.#_networkService.setDefaultHeaders({
      'Postbacks-Authorization': this.#_POSTBACKS_CLIENT_KEY,
    });
  }

  /**
   *
   * @param {string} apiEndpoint Endpoint excluding the base url of the service but including beginning slash.
   * @param {number} scheduleAt Epoch time in milliseconds.
   * @param {object} payload Object to be received as request body.
   * @returns {string} Reference id for the schedule created. It could be used
   * for cancelling the schedule in future.
   */
  async scheduleCallback(apiEndpoint: string, scheduleAt: number | Date, payload: Record<string, unknown> = {}) {
    if (scheduleAt < new Date().getTime() / 1000) {
      console.error({
        message: 'Not scheduling a request, since derived schedule time is less than current time. ',
      });
      return '';
    }
    const requestPayload = {
      body_string: JSON.stringify(payload),
      send_at: scheduleAt,
      url: `${ORDER_REQUEST_SERVICE_BASE_URL}${apiEndpoint}`,
    };
    const postbackResponse = await this.#_networkService.post({
      body: requestPayload,
      path: '/requestPostback',
    });
    console.info(`Postback scheduleId is ${postbackResponse.postback_id}`);
    return postbackResponse.postback_id;
  }

  /**
   *
   * @param {string} postbackId ScheduleId of callback returned when the callback was requested.
   */
  async cancelCallback(postbackId: string) {
    const postbackResponse = await this.#_networkService.delete({
      path: `/cancelPostback?postback_id=${postbackId}`,
    });
    console.info(`Postback response for deleting postbackId ${postbackId} is ${JSON.stringify(postbackResponse)}`);
  }
}

export const PostbacksService = new PostbacksServiceClass();
