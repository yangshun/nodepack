/**
 * Stream module implementation
 * Provides Node.js-compatible stream classes
 */

import type { QuickJSContext, QuickJSHandle } from 'quickjs-emscripten';

export function createStreamModule(vm: QuickJSContext): QuickJSHandle {
  // Evaluate stream implementation in QuickJS
  const streamCode = `
    // Get EventEmitter from the events module
    const StreamEventEmitter = globalThis.__nodepack_events.EventEmitter;

    /**
     * Base Stream class
     */
    class Stream extends StreamEventEmitter {
      constructor() {
        super();
      }

      pipe(dest, options) {
        const source = this;

        function ondata(chunk) {
          if (dest.writable) {
            const canContinue = dest.write(chunk);
            if (!canContinue && source.pause) {
              source.pause();
            }
          }
        }

        source.on('data', ondata);

        function ondrain() {
          if (source.readable && source.resume) {
            source.resume();
          }
        }

        dest.on('drain', ondrain);

        // Handle end
        if (!options || options.end !== false) {
          source.on('end', onend);
          source.on('close', onclose);
        }

        let didOnEnd = false;
        function onend() {
          if (didOnEnd) return;
          didOnEnd = true;
          dest.end();
        }

        function onclose() {
          if (didOnEnd) return;
          didOnEnd = true;
          if (typeof dest.destroy === 'function') dest.destroy();
        }

        // Handle errors
        function onerror(err) {
          cleanup();
          if (!this.listenerCount('error')) {
            throw err;
          }
        }

        source.on('error', onerror);
        dest.on('error', onerror);

        // Cleanup
        function cleanup() {
          source.removeListener('data', ondata);
          dest.removeListener('drain', ondrain);
          source.removeListener('end', onend);
          source.removeListener('close', onclose);
          source.removeListener('error', onerror);
          dest.removeListener('error', onerror);
        }

        return dest;
      }
    }

    /**
     * Readable stream
     */
    class Readable extends Stream {
      constructor(options) {
        super();
        options = options || {};

        this.readable = true;
        this.readableEnded = false;
        this.readableFlowing = null;
        this._buffer = [];
        this._reading = false;
        this._ended = false;
        this._paused = true;
        this._highWaterMark = options.highWaterMark || 16384;
        this._objectMode = options.objectMode || false;

        if (options.read) {
          this._read = options.read;
        }
      }

      _read(size) {
        // Override in subclasses
      }

      read(size) {
        if (this._buffer.length === 0) {
          if (this._ended) {
            return null;
          }
          if (!this._reading) {
            this._reading = true;
            this._read(size || this._highWaterMark);
            this._reading = false;
          }
        }

        if (this._buffer.length === 0) {
          return null;
        }

        const chunk = this._buffer.shift();
        return chunk;
      }

      push(chunk) {
        if (this._ended) {
          return false;
        }

        if (chunk === null) {
          this._ended = true;
          this.readableEnded = true;
          this.readable = false;
          this.emit('end');
          return false;
        }

        this._buffer.push(chunk);

        if (this.readableFlowing) {
          while (this._buffer.length > 0) {
            const data = this._buffer.shift();
            this.emit('data', data);
          }
        }

        return this._buffer.length < this._highWaterMark;
      }

      pause() {
        if (this.readableFlowing !== false) {
          this.readableFlowing = false;
          this.emit('pause');
        }
        this._paused = true;
        return this;
      }

      resume() {
        if (this.readableFlowing !== true) {
          this.readableFlowing = true;
          this.emit('resume');
        }
        this._paused = false;

        // Emit buffered data
        while (this._buffer.length > 0 && !this._paused) {
          const chunk = this._buffer.shift();
          this.emit('data', chunk);
        }

        // Try to read more
        if (!this._ended && !this._reading) {
          this._reading = true;
          this._read(this._highWaterMark);
          this._reading = false;
        }

        return this;
      }

      on(event, listener) {
        const result = super.on(event, listener);

        if (event === 'data') {
          if (this.readableFlowing !== false) {
            this.resume();
          }
        }

        return result;
      }

      destroy(error) {
        if (this._destroyed) {
          return this;
        }
        this._destroyed = true;
        this.readable = false;

        if (error) {
          this.emit('error', error);
        }
        this.emit('close');

        return this;
      }
    }

    /**
     * Writable stream
     */
    class Writable extends Stream {
      constructor(options) {
        super();
        options = options || {};

        this.writable = true;
        this.writableEnded = false;
        this.writableFinished = false;
        this._buffer = [];
        this._writing = false;
        this._ended = false;
        this._highWaterMark = options.highWaterMark || 16384;
        this._objectMode = options.objectMode || false;
        this._length = 0;

        if (options.write) {
          this._write = options.write;
        }
        if (options.final) {
          this._final = options.final;
        }
      }

      _write(chunk, encoding, callback) {
        // Override in subclasses
        callback();
      }

      _final(callback) {
        // Override in subclasses
        callback();
      }

      write(chunk, encoding, callback) {
        if (typeof encoding === 'function') {
          callback = encoding;
          encoding = 'utf8';
        }

        if (this._ended) {
          const err = new Error('write after end');
          if (callback) {
            callback(err);
          } else {
            this.emit('error', err);
          }
          return false;
        }

        this._buffer.push({ chunk, encoding, callback });
        this._length += this._objectMode ? 1 : (chunk.length || 0);

        this._process();

        return this._length < this._highWaterMark;
      }

      _process() {
        if (this._writing || this._buffer.length === 0) {
          return;
        }

        this._writing = true;
        const { chunk, encoding, callback } = this._buffer.shift();
        this._length -= this._objectMode ? 1 : (chunk.length || 0);

        this._write(chunk, encoding, (err) => {
          this._writing = false;

          if (err) {
            if (callback) {
              callback(err);
            } else {
              this.emit('error', err);
            }
            return;
          }

          if (callback) {
            callback();
          }

          if (this._buffer.length > 0) {
            this._process();
          } else if (this._buffer.length === 0) {
            this.emit('drain');

            if (this._ended && !this.writableFinished) {
              this._doFinish();
            }
          }
        });
      }

      end(chunk, encoding, callback) {
        if (typeof chunk === 'function') {
          callback = chunk;
          chunk = null;
          encoding = null;
        } else if (typeof encoding === 'function') {
          callback = encoding;
          encoding = null;
        }

        if (chunk !== null && chunk !== undefined) {
          this.write(chunk, encoding);
        }

        if (!this._ended) {
          this._ended = true;
          this.writableEnded = true;

          if (this._buffer.length === 0 && !this._writing) {
            this._doFinish();
          }
        }

        if (callback) {
          if (this.writableFinished) {
            callback();
          } else {
            this.once('finish', callback);
          }
        }

        return this;
      }

      _doFinish() {
        this._final((err) => {
          if (err) {
            this.emit('error', err);
            return;
          }

          this.writableFinished = true;
          this.writable = false;
          this.emit('finish');
        });
      }

      destroy(error) {
        if (this._destroyed) {
          return this;
        }
        this._destroyed = true;
        this.writable = false;

        if (error) {
          this.emit('error', error);
        }
        this.emit('close');

        return this;
      }
    }

    /**
     * Duplex stream (both readable and writable)
     */
    class Duplex extends Readable {
      constructor(options) {
        super(options);
        options = options || {};

        // Add writable properties
        this.writable = true;
        this.writableEnded = false;
        this.writableFinished = false;
        this._writeBuffer = [];
        this._writing = false;
        this._writeEnded = false;
        this._writeLength = 0;

        if (options.write) {
          this._write = options.write;
        }
        if (options.final) {
          this._final = options.final;
        }
      }

      _write(chunk, encoding, callback) {
        // Override in subclasses
        callback();
      }

      _final(callback) {
        // Override in subclasses
        callback();
      }

      write(chunk, encoding, callback) {
        if (typeof encoding === 'function') {
          callback = encoding;
          encoding = 'utf8';
        }

        if (this._writeEnded) {
          const err = new Error('write after end');
          if (callback) {
            callback(err);
          } else {
            this.emit('error', err);
          }
          return false;
        }

        this._writeBuffer.push({ chunk, encoding, callback });
        this._writeLength += this._objectMode ? 1 : (chunk.length || 0);

        this._processWrite();

        return this._writeLength < this._highWaterMark;
      }

      _processWrite() {
        if (this._writing || this._writeBuffer.length === 0) {
          return;
        }

        this._writing = true;
        const { chunk, encoding, callback } = this._writeBuffer.shift();
        this._writeLength -= this._objectMode ? 1 : (chunk.length || 0);

        this._write(chunk, encoding, (err) => {
          this._writing = false;

          if (err) {
            if (callback) {
              callback(err);
            } else {
              this.emit('error', err);
            }
            return;
          }

          if (callback) {
            callback();
          }

          if (this._writeBuffer.length > 0) {
            this._processWrite();
          } else if (this._writeBuffer.length === 0) {
            this.emit('drain');

            if (this._writeEnded && !this.writableFinished) {
              this._doFinish();
            }
          }
        });
      }

      end(chunk, encoding, callback) {
        if (typeof chunk === 'function') {
          callback = chunk;
          chunk = null;
          encoding = null;
        } else if (typeof encoding === 'function') {
          callback = encoding;
          encoding = null;
        }

        if (chunk !== null && chunk !== undefined) {
          this.write(chunk, encoding);
        }

        if (!this._writeEnded) {
          this._writeEnded = true;
          this.writableEnded = true;

          if (this._writeBuffer.length === 0 && !this._writing) {
            this._doFinish();
          }
        }

        if (callback) {
          if (this.writableFinished) {
            callback();
          } else {
            this.once('finish', callback);
          }
        }

        return this;
      }

      _doFinish() {
        this._final((err) => {
          if (err) {
            this.emit('error', err);
            return;
          }

          this.writableFinished = true;
          this.writable = false;
          this.emit('finish');
        });
      }
    }

    /**
     * Transform stream (duplex that transforms data)
     */
    class Transform extends Duplex {
      constructor(options) {
        super(options);
        options = options || {};

        if (options.transform) {
          this._transform = options.transform;
        }
        if (options.flush) {
          this._flush = options.flush;
        }
      }

      _transform(chunk, encoding, callback) {
        // Override in subclasses
        // Default: pass through
        callback(null, chunk);
      }

      _flush(callback) {
        // Override in subclasses
        callback();
      }

      _write(chunk, encoding, callback) {
        this._transform(chunk, encoding, (err, data) => {
          if (err) {
            callback(err);
            return;
          }

          if (data !== null && data !== undefined) {
            this.push(data);
          }

          callback();
        });
      }

      _final(callback) {
        this._flush((err, data) => {
          if (err) {
            callback(err);
            return;
          }

          if (data !== null && data !== undefined) {
            this.push(data);
          }

          this.push(null);
          callback();
        });
      }
    }

    /**
     * PassThrough stream (trivial transform)
     */
    class PassThrough extends Transform {
      constructor(options) {
        super(options);
      }
    }

    /**
     * Pipeline function - pipe streams together with error handling
     */
    function pipeline(...streams) {
      let callback;
      if (typeof streams[streams.length - 1] === 'function') {
        callback = streams.pop();
      }

      if (streams.length < 2) {
        throw new Error('pipeline requires at least 2 streams');
      }

      let error = null;
      const cleanup = [];

      for (let i = 0; i < streams.length - 1; i++) {
        const source = streams[i];
        const dest = streams[i + 1];

        source.pipe(dest);

        const onError = (err) => {
          if (!error) {
            error = err;
          }
        };

        source.on('error', onError);
        cleanup.push(() => source.removeListener('error', onError));
      }

      const lastStream = streams[streams.length - 1];

      const onFinish = () => {
        cleanup.forEach(fn => fn());
        if (callback) {
          callback(error);
        }
      };

      const onError = (err) => {
        if (!error) {
          error = err;
        }
      };

      lastStream.on('finish', onFinish);
      lastStream.on('error', onError);

      return lastStream;
    }

    /**
     * Finished function - get notified when a stream is finished
     */
    function finished(stream, callback) {
      let finished = false;

      function cleanup() {
        stream.removeListener('end', onEnd);
        stream.removeListener('finish', onFinish);
        stream.removeListener('error', onError);
        stream.removeListener('close', onClose);
      }

      function onEnd() {
        if (finished) return;
        finished = true;
        cleanup();
        callback();
      }

      function onFinish() {
        if (finished) return;
        finished = true;
        cleanup();
        callback();
      }

      function onError(err) {
        if (finished) return;
        finished = true;
        cleanup();
        callback(err);
      }

      function onClose() {
        if (finished) return;
        finished = true;
        cleanup();
        callback();
      }

      stream.on('end', onEnd);
      stream.on('finish', onFinish);
      stream.on('error', onError);
      stream.on('close', onClose);

      return cleanup;
    }

    const stream = {
      Stream,
      Readable,
      Writable,
      Duplex,
      Transform,
      PassThrough,
      pipeline,
      finished,
    };

    stream;
  `;

  const result = vm.evalCode(streamCode);
  if (result.error) {
    const error = vm.dump(result.error);
    result.error.dispose();
    throw new Error(`Failed to create stream module: ${error}`);
  }

  return result.value;
}
