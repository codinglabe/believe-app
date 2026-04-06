/**
 * AudioWorklet processor that captures microphone input and posts Float32Array
 * chunks to the main thread (replaces deprecated ScriptProcessorNode).
 */
class PcmProcessor extends AudioWorkletProcessor {
  process(inputs, _outputs, _parameters) {
    const input = inputs[0]
    if (input && input.length > 0) {
      const channel = input[0]
      if (channel && channel.length > 0) {
        const copy = new Float32Array(channel.length)
        copy.set(channel)
        this.port.postMessage(copy)
      }
    }
    return true
  }
}

registerProcessor("pcm-processor", PcmProcessor)
