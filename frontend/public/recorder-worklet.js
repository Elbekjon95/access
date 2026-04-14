class RecorderProcessor extends AudioWorkletProcessor {
  process(inputs, outputs, parameters) {
    const input = inputs[0];
    if (input.length > 0) {
      // Faqat birinchi kanalni yuboramiz (mono)
      const channelData = input[0];
      // Audio signallarni Float32Array ko'rinishida asosiy thread-ga yuboramiz
      this.port.postMessage(channelData);
    }
    return true;
  }
}

registerProcessor('recorder-worklet', RecorderProcessor);
