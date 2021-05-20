/* global videometrics */
var youbora = require('youboralib')
var manifest = require('../manifest.json')

youbora.adapters.PsWebmaf = youbora.Adapter.extend({

  constructor: function () {
    youbora.adapters.PsWebmaf.__super__.constructor.call(this, {})
  },

  /** Override to return current plugin version */
  getVersion: function () {
    return manifest.version + '-' + manifest.name + '-' + manifest.tech
  },

  /** Override to return current playhead of the video */
  getPlayhead: function () {
    return this.playhead
  },

  /** Override to return video duration */
  getDuration: function () {
    return this.duration
  },

  /** Override to return current bitrate */
  getBitrate: function () {
    return this.bitrate || this.currentBitrate || 0
  },

  getRendition: function () {
    if (this.plugin.getBitrate()) {
      if (this.naturalWidth && this.naturalHeight) {
        return youbora.Util.buildRenditionString(this.naturalWidth, this.naturalHeight, this.plugin.getBitrate())
      }
      return youbora.Util.buildRenditionString(this.plugin.getBitrate())
    }
    return null
  },

  getResource: function () {
    return this.url || 'unavailable'
  },

  /** Override to return user bandwidth throughput */
  getThroughput: function () {
    return this.throughput || -1
  },

  /** Override to return player version */
  getPlayerVersion: function () {
    return this.playerVersion
  },

  /** Override to return player's name */
  getPlayerName: function () {
    return 'ps-webmaf'
  },

  /** Register listeners to this.player. */
  registerListeners: function () {
    window.external.user('{"command":"appversion"}')
    // Enable playhead monitor (buffer = true, seek = false)
    this.monitorPlayhead(true, true, 1200)
  },

  /** Unregister listeners to this.player. */
  unregisterListeners: function () {
    // Disable playhead monitoring
    if (this.monitor) this.monitor.stop()
    this.stopTimers()
  },

  accessfunctionHandler: function (json) {
    try {
      if (json) {
        try {
          var data = JSON.parse(json)
        } catch (err) {
          youbora.Log.warn('Accessfunction response is not correct: "' + json + '".')
          return
        }
        // Expose json content
        if (data.command != 'getPlaybackTime') { youbora.Log.debug(json) } // eslint-disable-line

        switch (data.command) {
          case 'playerStreamingError':
          case 'playerError':
            this.conditionalError(data.errorCode, data.error)
            this.fireStop()
            this.stopTimers()
            break
          case 'AppWebBrowser':
            this.conditionalError(data.errorCode, 'Web Browser Error')
            this.fireStop()
            this.stopTimers()
            break
          case 'playerStatusChange':
            switch (data.playerState) {
              case 'endOfStream':
              case 'stopped':
              case 'notReady':
                this.fireStop()
                this.stopTimers()
                break
              case 'paused':
                this.firePause()
                break
              case 'buffering':
                // this.fireBufferBegin()
                break
              case 'opening':
                this.duration = data.totalLength
                this.fireStart()
                this.startTimers()
                break
              case 'playing':
                if (this.flags.isSeeking) {
                  if (data && data.elapsedTime && this.playhead != data.elapsedTime) { // eslint-disable-line
                    this.playhead = data.elapsedTime
                    this.fireSeekEnd()
                  }
                }
                // this.fireBufferEnd()
                this.fireJoin()
                this.fireResume()
                break
            }
            break
          case 'DisplayingVideo':
            this.fireJoin()
            break
          case 'getPlaybackTime':
            if (this.playhead != data.elapsedTime) { // eslint-disable-line
              this.playhead = data.elapsedTime
              // this.fireSeekEnd()
              // this.fireBufferEnd()
              this.fireResume()
            }
            break
          case 'setPlayTime':
            this.playhead = data.playTime
            this.fireSeekBegin()
            break
          case 'getBitrate':
            this.bitrate = data.bitrate
            this.throughput = data.bandwidth
            break
          case 'playerMessage':
            switch (data.msg_code) {
              case -2140536828:
                this.conditionalError(data.msg_code, data.msg_info)
                this.fireStop()
                this.stopTimers()
                break
            }
            break
          case 'contentAvailable':
            this.duration = data.totalLength
            break
          case 'appversion':
            this.playerVersion = data.version
            break
        }
      }
    } catch (err) {
      youbora.Log.error(err)
    }
  },

  conditionalError: function (code, message) {
    if (this.flags.isStarted || this.lastUrl !== this.url) {
      this.fireError(code, message)
      this.lastUrl = this.url
    }
  },

  startTimers: function () {
    this.timers = this.timers || {}
    // ask for playheads
    this.timers.playhead = setInterval(function () {
      window.external.user('{"command":"getPlaybackTime"}')
    }, 1000)

    this.timers.bitrate = setInterval(function () {
      window.external.user('{"command":"getBitrate"}')
    }, 5000)

    // ask for url, bandwidth,,,
    this.timers.updateMetrics = setInterval(function () {
      videometrics.poll()
      this.url = videometrics.url
      this.bandwidth = videometrics.bandwidth
      this.naturalWidth = videometrics.naturalWidth
      this.naturalHeight = videometrics.naturalHeight
      this.currentBitrate = videometrics.currentBitrate
    }, 1000)
  },

  stopTimers: function () {
    for (var key in this.timers) {
      clearInterval(this.timers[key])
    }
  }
})

module.exports = youbora.adapters.PsWebmaf
