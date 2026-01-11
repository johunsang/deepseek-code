/**
 * 인터랙티브 모드용 Worker
 */
import { parentPort, workerData } from 'worker_threads';
import { runCodingTask } from './agent/coding';

if (parentPort) {
  const { prompt, modelId } = workerData;

  runCodingTask(prompt, { modelId, maxSteps: 100 })
    .then(result => {
      parentPort!.postMessage({
        success: result.success,
        result: result.result,
        usage: result.usage,
      });
    })
    .catch(err => {
      parentPort!.postMessage({
        success: false,
        result: err.message,
        usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
      });
    });
}
