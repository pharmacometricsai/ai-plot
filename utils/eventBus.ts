// A map to store event listeners to ensure they can be removed correctly.
// Key: event name (string)
// Value: Map where Key is the original callback and Value is the created listener function
const eventListeners = new Map<string, Map<(data: any) => void, (e: any) => void>>();

interface EventBus {
  on(event: string, callback: (data: any) => void): void;
  dispatch(event: string, data?: any): void;
  remove(event: string, callback: (data: any) => void): void;
}

const eventBus: EventBus = {
  on(event, callback) {
    if (!eventListeners.has(event)) {
      eventListeners.set(event, new Map());
    }
    const listener = (e: any) => callback(e.detail);
    // Store the mapping between the original callback and the actual listener function
    eventListeners.get(event)!.set(callback, listener);
    document.addEventListener(event, listener);
  },
  
  dispatch(event, data) {
    document.dispatchEvent(new CustomEvent(event, { detail: data }));
  },
  
  remove(event, callback) {
    if (eventListeners.has(event)) {
      const listenersForEvent = eventListeners.get(event)!;
      const listenerToRemove = listenersForEvent.get(callback);
      if (listenerToRemove) {
        document.removeEventListener(event, listenerToRemove);
        listenersForEvent.delete(callback);
      }
    }
  },
};

export default eventBus;
