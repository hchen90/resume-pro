import "server-only";

const locks = new Map<string, Promise<void>>();

export async function acquireResumeAssistantLock(resumeId: string) {
  const previous = locks.get(resumeId) ?? Promise.resolve();
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });

  const chained = previous.then(() => gate);
  locks.set(resumeId, chained);
  await previous;

  return () => {
    release();
    if (locks.get(resumeId) === chained) {
      locks.delete(resumeId);
    }
  };
}
