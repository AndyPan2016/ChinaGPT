// To store message streaming controller
export const ChatControllerPool = {
  controllers: {} as Record<string, AbortController>,

  addController(
    currentIndex: Array<any>,
    messageId: number,
    controller: AbortController,
  ) {
    const key = this.key(currentIndex, messageId);
    this.controllers[key] = controller;
    return key;
  },

  stop(currentIndex: Array<any>, messageId: number) {
    const key = this.key(currentIndex, messageId);
    const controller = this.controllers[key];
    controller?.abort();
  },

  stopAll() {
    Object.values(this.controllers).forEach((v) => v.abort());
  },

  hasPending() {
    return Object.values(this.controllers).length > 0;
  },

  remove(currentIndex: Array<any>, messageId: number) {
    const key = this.key(currentIndex, messageId);
    delete this.controllers[key];
  },

  key(currentIndex: Array<any>, messageIndex: number) {
    return `${currentIndex[0]},${currentIndex[1]},${messageIndex}`;
  },
};
