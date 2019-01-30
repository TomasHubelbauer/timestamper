window.addEventListener('load', _ => {
  const tag = (type, propsAndOrChildren) => {
    if (propsAndOrChildren.length === 0) {
      return React.createElement(type);
    }

    // Accepts object as props as long as it is an object which is not a React element instance ($$typeof === Symbol) or an array
    if (typeof propsAndOrChildren[0] === 'object' && !(propsAndOrChildren[0] instanceof Array) && !propsAndOrChildren[0].$$typeof) {
      return React.createElement(type, propsAndOrChildren[0], ...propsAndOrChildren.slice(1));
    }

    return React.createElement(type, undefined, ...propsAndOrChildren);
  }

  const a = (...propsAndOrChildren) => tag('a', propsAndOrChildren);
  const audio = (props) => React.createElement('audio', props);
  const button = (...propsAndOrChildren) => tag('button', propsAndOrChildren);
  const div = (...propsAndOrChildren) => tag('div', propsAndOrChildren);
  const h1 = (...propsAndOrChildren) => tag('h1', propsAndOrChildren);
  const input = (props) => React.createElement('input', props);
  const p = (...propsAndOrChildren) => tag('p', propsAndOrChildren);
  const progress = (props) => React.createElement('progress', props);
  const span = (...propsAndOrChildren) => tag('span', propsAndOrChildren);

  class App extends React.Component {
    constructor(props) {
      super(props);
      this.state = {
        media: undefined,
        voices: [
          { name: 'sole', stamps: [] }
        ],
        selectedVoiceIndex: 0,
        snippet: undefined,
      };

      this.onMediaInputChange = event => {
        if (event.currentTarget.files.length === 0) {
          return;
        }
    
        // Note that `multiple` is not set on the `input`, this is just a sanity check
        if (event.currentTarget.files.length > 1) {
          alert(`Only a single file is allowed. You've selected ${event.currentTarget.files.length}.`);
          return;
        }
    
        const file = event.currentTarget.files[0];
        const match = /(audio|video)\/\w+/g.exec(file.type);
        if (match === null) {
          alert(`Only audio and video files are allowed. You've selected ${file.type}.`);
          return;
        }

        // Prevent accidental file replacement causing stamp data loss by requiring a confirmation
        if (this.state.voices.find(voice => voice.stamps.length > 0) && !confirm('Do you really want to abandon the existing collected timestamps?')) {
          return;
        }
    
        // Note that assigning `File` (which is a `Blob`) directly to `srcObject` is not supported in browsers yet (but is in the specification)
        this.setState({ media: { type: match[1], src: URL.createObjectURL(file), name: file.name } });
        
        // See if we have persisted any stamps for the file being opened
        const draft = localStorage.getItem(`timestamper-${file.name}`);
        if (draft !== null) {
          this.setState({ voices: JSON.parse(draft), selectedVoiceIndex: 0 }, () => {
            // Focus the text input of the pivot stamp
            const pivotStampIndex = this.getPivotIndex(this.state.voices[this.state.selectedVoiceIndex].stamps);
            if (pivotStampIndex !== -1) {
              document.querySelector(`input[data-index="${pivotStampIndex}"]`).focus();
              document.querySelector(`input[data-index="${pivotStampIndex}"]`).click();
            }
          });
        }
      };

      this.onStopButtonClick = _ => {
        this.setState({ snippet: undefined });
        this.playerMedioNode.pause();
        this.playerMedioNode.currentTime = 0;
      };

      this.playerMedioRef = node => {
        if (node === null) {
          // Collect the existing URL to prevent memory leaks
          URL.revokeObjectURL(this.playerMedioNode.src);
        }

        this.playerMedioNode = node;
      };

      this.onTimeStartButtonClick = _ => {
        const stamp = { startTime: this.playerMedioNode.currentTime, text: '' };
        let index;
        // Sort the stamps to always be chronological no matter the order they were entered in
        this.setState(state => {
          const stamps = [ ...state.voices[state.selectedVoiceIndex].stamps, stamp ].sort((a, b) => a.time - b.time);
          index = stamps.indexOf(stamp);
          return { voices: [ ...state.voices.map((voice, i) => i === state.selectedVoiceIndex ? { ...voice, stamps } : voice) ] };
        }, () => {
          this.revealStamp(index);
          this.persistStamps();
        });
      };

      this.onTimeEndButtonClick = _ => {
        let index;
        this.setState(state => {
          index = this.getPivotIndex(state.voices[state.selectedVoiceIndex].stamps);
          const stamps = [ ...state.voices[state.selectedVoiceIndex].stamps.map((s, i) => i === index ? { ...s, endTime: this.playerMedioNode.currentTime } : s) ];
          return { voices: [ ...state.voices.map((voice, i) => i === state.selectedVoiceIndex ? { ...voice, stamps } : voice) ] };
        }, () => {
          this.revealStamp(index);
          this.persistStamps();
        });
      };

      this.onSpeedInputChange= event => {
        this.playerMedioNode.playbackRate = event.currentTarget.value;
      };

      this.onHelpButtonClick = _ => {
        alert(this.shortcuts.map(shortcut => shortcut.key + '\n    ' + shortcut.title + '\n').join('\n'));
      };

      this.onCloseButtonClick = _ => {
        if (this.state.voices.find(voice => voice.stamps.length > 0) && !confirm('Do you really want to close these stamps?')) {
          return;
        }

        // Reset the application state causing the player to unmount and the file URL to be collected
        this.setState({ media: undefined, stamps: [], snippet: undefined });
      };

      this.onExportJsonButtonClick = _ => {
        const downloadA = document.createElement('a');
        downloadA.download = this.state.media.name + '.stamps.json';
        downloadA.href = `data:application/json;charset=utf8,` + encodeURIComponent(JSON.stringify({ name: this.state.media.name, voices: this.state.voices }, null, 2));
        document.body.appendChild(downloadA);
        downloadA.click();
        downloadA.remove();
      };

      this.onExportCsvButtonClick = _ => {
        const downloadA = document.createElement('a');
        downloadA.download = this.state.media.name + '.stamps.csv';
        downloadA.href = `data:text/csv;charset=utf8,Voice,Start Time,End Time,Text\n` + encodeURIComponent(this.state.voices.map(voice => voice.stamps.map(s => `${voice.name},${s.startTime},${s.endTime},${s.text}`).join('\n')).join('\n') + '\n');
        document.body.appendChild(downloadA);
        downloadA.click();
        downloadA.remove();
      };

      this.onLoopButtonClick = event => {
        const index = Number(event.currentTarget.dataset.index);
        const stamp = this.state.voices[this.state.selectedVoiceIndex].stamps[index];
        this.setState({ snippet: { voiceIndex: this.state.selectedVoiceIndex, stampIndex: index, loop: true } });
        this.seekSafely(stamp.startTime);
        // Ensure the playback is ongoing
        this.playerMedioNode.play();
      };

      this.onMoveStart100MillisecondsBackwardsButtonClick = event => {
        const index = Number(event.currentTarget.dataset.index);
        this.moveStartTime(index, -.1);
      };

      this.onMoveStart10MillisecondsBackwardsButtonClick = event => {
        const index = Number(event.currentTarget.dataset.index);
        this.moveStartTime(index, -.01);
      };

      this.onMoveStart10MillisecondsForwardsButtonClick = event => {
        const index = Number(event.currentTarget.dataset.index);
        this.moveStartTime(index, +0.1);
      };

      this.onMoveStart100MillisecondsForwardsButtonClick = event => {
        const index = Number(event.currentTarget.dataset.index);
        this.moveStartTime(index, +.1);
      };

      this.onMoveEnd100MillisecondsBackwardsButtonClick = event => {
        const index = Number(event.currentTarget.dataset.index);
        this.moveEndTime(index, -.1);
      };

      this.onMoveEnd10MillisecondsBackwardsButtonClick = event => {
        const index = Number(event.currentTarget.dataset.index);
        this.moveEndTime(index, -.01);
      };

      this.onMoveEnd10MillisecondsForwardsButtonClick = event => {
        const index = Number(event.currentTarget.dataset.index);
        this.moveEndTime(index, +.01);
      };

      this.onMoveEnd100MillisecondsForwardsButtonClick = event => {
        const index = Number(event.currentTarget.dataset.index);
        this.moveEndTime(index, +.1);
      };

      this.onTextInputChange = event => {
        const index = Number(event.currentTarget.dataset.index);
        const text = event.currentTarget.value;
        this.setState(state => {
          const stamps = [ ...state.voices[state.selectedVoiceIndex].stamps.map((stamp, i) => i === index ? { ...stamp, text } : stamp) ];
          return { voices: [ ...state.voices.map((voice, i) => i === state.selectedVoiceIndex ? { ...voice, stamps } : voice) ] };
        }, this.persistStamps);
      };

      this.onTextInputClick = event => {
        const index = Number(event.currentTarget.dataset.index);
        const stamp = this.state.voices[this.state.selectedVoiceIndex].stamps[index];
        this.setState({ snippet: { voiceIndex: this.state.selectedVoiceIndex, stampIndex: index } }, () => {
          this.seekSafely(stamp.startTime);
          this.playerMedioNode.play();
        });
      };

      this.onDeleteButtonClick = event => {
        const index = Number(event.currentTarget.dataset.index);
        this.setState(state => {
          const stamps = [ ...state.voices[state.selectedVoiceIndex].stamps.filter((_, i) => i !== index) ];
          return { voices: [ ...state.voices.map((voice, i) => i === state.selectedVoiceIndex ? { ...voice, stamps } : voice) ] };
        }, this.persistStamps);
      };

      this.shortcuts = [
        { key: 'Space', title: 'Toggle playback', context: ['page', 'player'], action: () => this.playerMedioNode.paused ? this.playerMedioNode.play() : this.playerMedioNode.pause() },
        { key: 'Ctrl+Space', title: 'Toggle playback (in editor)', context: ['editor'], action: () => this.playerMedioNode.paused ? this.playerMedioNode.play() : this.playerMedioNode.pause() },
        { key: 'Enter', id: 'open', title: 'Open a new stamp', context: ['page', 'player', 'editor'], action: this.onTimeStartButtonClick },
        { key: 'Ctrl+Enter', id: 'close', title: 'Close the closets open stamp prior to current time', context: ['page', 'player', 'editor'], action: this.onTimeEndButtonClick },
        { key: 'Ctrl+ArrowUp', title: 'Speed up the playback', context: ['page', 'player', 'editor'], action: () => this.playerMedioNode.playbackRate += .1 },
        { key: 'Ctrl+ArrowDown', title: 'Slow down the playback', context: ['page', 'player', 'editor'], action: () => this.playerMedioNode.playbackRate -= .1 },
        { key: 'ArrowRight', title: 'Skip forwards 1 s', context: ['page', 'player'], action: () => this.playerMedioNode.currentTime += 1 },
        { key: 'ArrowLeft', title: 'Skip backwards 1 s', context: ['page', 'player'], action: () => this.playerMedioNode.currentTime -= 1 },
        { key: 'ArrowUp', title: 'Go to the above text editor', context: ['editor'], action: (editorInput) => {
          const above = document.querySelector(`input[data-index="${Math.max(0, Number(editorInput.dataset.index) - 1)}"]`);
          above.focus();
          above.click();
        } },
        { key: 'ArrowDown', title: 'Go to the below text editor', context: ['editor'], action: (editorInput) => {
          const below = document.querySelector(`input[data-index="${Math.min(this.state.voices[this.state.selectedVoiceIndex].stamps.length - 1, Number(editorInput.dataset.index) + 1)}"]`);
          below.focus();
          below.click();
        } },
        { key: 'Ctrl+D', id: 'delete', title: 'Delete the given stamp', context: ['editor'], action: (editorInput) => this.onDeleteButtonClick({ currentTarget: editorInput }) },
        { key: 'Shift+Enter', id: 'loop', title: 'Loop preview the current stamp', context: ['editor'], action: (editorInput) => this.onLoopButtonClick({ currentTarget: editorInput }) },
        { key: 'Shift+Escape', id: 'stop', title: 'Stop loop preview if playing', context: ['editor'], action: this.onStopButtonClick },
        { key: 'Ctrl+ArrowLeft', id: 'start-back-100', title: 'Remove 100 ms off the start time', context: ['editor'], action: (editorInput) => this.onExtendStart100MillisecondsBackwardsButtonClick({ currentTarget: editorInput }) },
        { key: 'Shift+ArrowLeft', id: 'start-back-10', title: 'Remove 10 ms off the start time', context: ['editor'], action: (editorInput) => this.onExtendStart10MillisecondsBackwardsButtonClick({ currentTarget: editorInput }) },
        { key: 'Shift+ArrowRight', id: 'start-forth-10', title: 'Add 10 ms to the start time', context: ['editor'], action: (editorInput) => this.onExtendStart10MillisecondsForwardsButtonClick({ currentTarget: editorInput }) },
        { key: 'Ctrl+ArrowRight', id: 'start-forth-100', title: 'Add 100 ms to the start time', context: ['editor'], action: (editorInput) => this.onExtendStart100MillisecondsForwardsButtonClick({ currentTarget: editorInput }) },
        { key: 'Alt+Ctrl+ArrowLeft', id: 'end-back-100', title: 'Remove 100 ms off the end time', context: ['editor'], action: (editorInput) => this.onExtendEnd100MillisecondsBackwardsButtonClick({ currentTarget: editorInput }) },
        { key: 'Alt+ArrowLeft', id: 'end-back-10', title: 'Remove 10 ms off the end time', context: ['editor'], action: (editorInput) => this.onExtendEnd10MillisecondsBackwardsButtonClick({ currentTarget: editorInput }) },
        { key: 'Alt+ArrowRight', id: 'end-forth-10', title: 'Add 10 ms to the end time', context: ['editor'], action: (editorInput) => this.onExtendStart10MillisecondsForwardsButtonClick({ currentTarget: editorInput }) },
        { key: 'Alt+Ctrl+ArrowRight', id: 'end-forth-100', title: 'Add 100 ms to the end time', context: ['editor'], action: (editorInput) => this.onExtendStart100MillisecondsForwardsButtonClick({ currentTarget: editorInput }) },
      ];
    }
  
    render() {
      const pivotStampIndex = this.playerMedioNode && this.getPivotIndex(this.state.voices[this.state.selectedVoiceIndex].stamps);
      return div({},
        !this.state.media && h1('Timestamper'),
        !this.state.media && input({ type: 'file', accept: 'audio/*,video/*', onChange: this.onMediaInputChange }),
        !this.state.media && p(
          'Copyright © Tomas Hubelbauer ·',
          a({ href: 'https://github.com/TomasHubelbauer/timestamper', target: '_blank' }, 'GitHub repository'),
        ),
        this.state.media && div({ id: 'panelDiv' },
          // Prevent the audio/video from taking focus with negative tab index in order not to break the Enter & Space keyboard shortcuts
          // Mind the audio/video ID as it is used for styling
          this.getPlayer(this.state.media.type)({ controls: true, tabIndex: -1, id: 'mediaMedio', ref: this.playerMedioRef, src: this.state.media.src }),
          this.playerMedioNode && div({ id: 'editorDiv' },
            this.state.media.name + ' ·',
            span({ id: 'timeSpan', className: 'timeSpan' }, getTimestamp(this.playerMedioNode.currentTime)),
            '·',
            button({ onClick: this.onTimeStartButtonClick, title: this.getShortcut('open') }, 'Time start'),
            button({ onClick: this.onTimeEndButtonClick, title: this.getShortcut('close') }, 'Time end'),
            '· Speed:',
            input({ type: 'range', min: .25, max: 1.5, step: .01, value: this.playerMedioNode.playbackRate, onChange: this.onSpeedInputChange }),
            this.playerMedioNode.playbackRate.toFixed(2),
            button({ onClick: this.onHelpButtonClick, id: 'helpButton' }, 'Help'),
            button({ onClick: this.onCloseButtonClick }, 'Close'),
            button({ onClick: this.onExportCsvButtonClick }, 'Export CSV'),
            button({ onClick: this.onExportJsonButtonClick }, 'Export JSON'),
          ),
          this.playerMedioNode && this.playerMedioNode.duration && div(
            this.state.snippet === undefined && (this.playerMedioNode.paused ? 'Paused' : 'Playing the whole song'),
            this.state.snippet !== undefined && div(
              `${this.state.snippet.loop ? 'Looping' : 'Playing'} a snippet of a stamp #${this.state.snippet.stampIndex} from voice #${this.state.snippet.voiceIndex}`,
              this.state.voices[this.state.snippet.voiceIndex].stamps[this.state.snippet.stampIndex].text && ` "${this.state.voices[this.state.snippet.voiceIndex].stamps[this.state.snippet.stampIndex].text}"`,
              this.renderRange(this.state.voices[this.state.snippet.voiceIndex].stamps[this.state.snippet.stampIndex]),
            ),
            div({ id: 'lyricsDiv' },
              this.state.voices[this.state.selectedVoiceIndex].stamps.map((stamp, index) => div(
                {
                  key: index,
                  className: 'lyricDiv',
                  style: {
                    left: `calc(50% - ${this.playerMedioNode.currentTime * 100}px)`,
                    transform: `translate(calc(0% + ${stamp.startTime * 100}px), ${Math.round(this.getSeededRandom(index) * 4)}em)`,
                  },
                },
                stamp.text,
                (this.playerMedioNode.currentTime >= stamp.startTime && this.playerMedioNode.currentTime <= (stamp.endTime || this.playerMedioNode.duration)) &&
                  progress({ max: (stamp.endTime || this.playerMedioNode.duration) - stamp.startTime, value: this.playerMedioNode.currentTime - stamp.startTime }),
              )),
            ),
          ),
          'Voice: ',
          this.state.voices.map((voice, index) => button({ key: index, disabled: index === this.state.selectedVoiceIndex }, voice.name)),
          button({ title: 'Add a new voice' }, '+'),
          button({ title: 'Delete this voice' }, '-'),
          button({ title: 'Rename this voice' }, 'Rename'),
        ),
        this.state.media && this.state.voices[this.state.selectedVoiceIndex].stamps.map((stamp, index) => {
          return div({ key: index, className: index === pivotStampIndex ? 'stampDiv pivotStampDiv' : 'stampDiv' },
            div({ className: 'toolDiv' },
              (this.state.snippet && this.state.snippet.voiceIndex === this.state.selectedVoiceIndex && this.state.snippet.stampIndex === index)
                ? button({ onClick: this.onStopButtonClick, title: this.getShortcut('stop') }, '■')
                : button({ 'data-index': index, onClick: this.onLoopButtonClick, title: this.getShortcut('loop') }, '▶'),
              button({ 'data-index': index, onClick: this.onMoveStart100MillisecondsBackwardsButtonClick, title: this.getShortcut('start-back-100') }, '-100 ms'),
              button({ 'data-index': index, onClick: this.onMoveStart10MillisecondsBackwardsButtonClick, title: this.getShortcut('start-back-10') }, '-10 ms'),
              button({ 'data-index': index, onClick: this.onMoveStart10MillisecondsForwardsButtonClick, title: this.getShortcut('start-forth-10') }, '+10 ms'),
              button({ 'data-index': index, onClick: this.onMoveStart100MillisecondsForwardsButtonClick, title: this.getShortcut('start-forth-100') }, '+100 ms'),
              span({ className: 'timeSpan' }, getTimestamp(stamp.startTime) + (stamp.endTime !== undefined ? '-' : ': ')),
              stamp.endTime && span({ className: 'timeSpan' }, getTimestamp(stamp.endTime)),
              stamp.endTime && button({ 'data-index': index, onClick: this.onMoveEnd100MillisecondsBackwardsButtonClick, title: this.getShortcut('end-back-100') }, '-100 ms'),
              stamp.endTime && button({ 'data-index': index, onClick: this.onMoveEnd10MillisecondsBackwardsButtonClick, title: this.getShortcut('end-back-10') }, '-10 ms'),
              stamp.endTime && button({ 'data-index': index, onClick: this.onMoveEnd10MillisecondsForwardsButtonClick, title: this.getShortcut('end-forth-10') }, '+10 ms'),
              stamp.endTime && button({ 'data-index': index, onClick: this.onMoveEnd100MillisecondsForwardsButtonClick, title: this.getShortcut('end-forth-100') }, '+100 ms'),
              button({ 'data-index': index, onClick: this.onDeleteButtonClick, title: this.getShortcut('delete') }, 'Delete'),
              '#' + index,
            ),
            input({ value: stamp.text, 'data-index': index, onChange: this.onTextInputChange, onClick: this.onTextInputClick }),
          );
        }),
      );
    }

    renderRange(stamp) {
      if (stamp.endTime !== undefined) {
        return ` between ${getTimestamp(stamp.startTime)} and ${getTimestamp(stamp.endTime)}.`;
      }

      return ` from ${getTimestamp(stamp.startTime)}.`;
    }

    getSeededRandom(seed) {
      const x = Math.sin(seed) * 10000;
      return x - Math.floor(x);
    }

    getStamps() {
      return this.state.voices[this.state.selectedVoiceIndex].stamps;
    }

    getPlayer(type) {
      if (type === 'audio') return audio;
      if (type === 'video') return video;
      throw new Error(`Unexpected media type ${type}. Expected 'audio' or 'video'.`);
    }

    getPivotIndex(stamps) {
      // Find the closets open stamp before the current time
      const stamp = stamps.filter(s => s.endTime === undefined && s.startTime < this.playerMedioNode.currentTime).slice(-1)[0];
      return stamps.indexOf(stamp);
    }

    getShortcut(id) {
      const shortcut = this.shortcuts.find(s => s.id === id);
      return `${shortcut.title} (${shortcut.key})`;
    }

    moveStartTime(index, delta) {
      this.setState(
        state => {
          const snippet = { voiceIndex: this.state.selectedVoiceIndex, stampIndex: index, loop: state.snippet && state.snippet.loop };
          const stamps = [ ...state.voices[state.selectedVoiceIndex].stamps.map((stamp, i) => i === index ? { ...stamp, startTime: stamp.startTime + delta } : stamp) ];
          return { snippet, voices: [ ...state.voices.map((voice, i) => i === state.selectedVoiceIndex ? { ...voice, stamps } : voice) ] };
        },
        () => {
          this.seekSafely(this.state.voices[this.state.selectedVoiceIndex].stamps[index].startTime);
          this.playerMedioNode.play();
        }
      );
    }

    moveEndTime(index, delta) {
      this.setState(
        state => {
          const snippet = { voiceIndex: this.state.selectedVoiceIndex, stampIndex: index, loop: state.snippet && state.snippet.loop };
          const stamps = [ ...state.voices[state.selectedVoiceIndex].stamps.map((stamp, i) => i === index ? { ...stamp, endTime: stamp.endTime ? stamp.endTime + delta : undefined } : stamp) ];
          return { snippet, voices: [ ...state.voices.map((voice, i) => i === state.selectedVoiceIndex ? { ...voice, stamps } : voice) ] };
        },
        () => {
          this.seekSafely(this.state.voices[this.state.selectedVoiceIndex].stamps[index].startTime);
          this.playerMedioNode.play();
        }
      );
    }
    
    revealStamp(index) {
      const stampInput = document.querySelector(`input[data-index="${index}"]`);
      stampInput.scrollIntoView({ block: 'center' });
      stampInput.focus();
    }

    persistStamps() {
      // Persist the stamps in local storage to recall in case the same song gets opened again
      localStorage.setItem(`timestamper-${this.state.media.name}`, JSON.stringify(this.state.voices));
    }

    seekSafely(time) {
      // Note that the medio element has time precision or 6 decimal places and we need to avoid a loop like this:
      // 1. We set the current time to start time, 0.123456000000001 (artifact of adding .1 or .01)
      // 2. The player stores it and in the next tick trims it down to 6 decimal places: 0.123456
      // 3. Current time is now 0.123456 but start time is still 0.123456000000001
      // 4. Current time < start time so we set the current time to start time
      // 5. Go to 2 - this loops endlessly, occasionally it breaks out (dropped frames while encoding?), but it stutters

      // Calculate an factor which will shift the six digits of precision in the decimal part to the integer part and back
      const power = Math.pow(10, 6);
      // Note that epsilon here is the smallest number by which we can increment the time while still staying in the medio element's precision boundary
      this.playerMedioNode.currentTime = /* Truncate */ ~~(time * power /* Shift fractional part to integer part */ + 1 /* Bump by epsilon */) / power /* Shift back */;
    }

    componentDidMount() {
      // Note that `timeupdate` is too infrequent (Firefox ~300 ms, Chrome ~200 ms, Safari N/A) so we use RAF instead
      const raf = () => {
        this.forceUpdate();

        if (this.state.snippet !== undefined) {
          const stamp = this.state.voices[this.state.selectedVoiceIndex].stamps[this.state.snippet.stampIndex];

          if (this.state.snippet.loop) {
            // Confine the playback range to the start and end (if any) time of the stamp
            if (stamp.startTime > this.playerMedioNode.currentTime || this.playerMedioNode.currentTime > stamp.endTime) {
              this.seekSafely(stamp.startTime);
            }
          } else {
            // Stop previewing when the snippet ends or the user scrubs outside of it
            if (stamp.startTime > this.playerMedioNode.currentTime) {
              this.setState({ snippet: undefined });
            } else if (this.playerMedioNode.currentTime > stamp.endTime) {
              this.playerMedioNode.pause();
              this.seekSafely(stamp.endTime || stamp.startTime);
              this.setState({ snippet: undefined });
            }
          }
        }

        window.requestAnimationFrame(raf);
      };

      window.requestAnimationFrame(raf);

      window.addEventListener('keypress', event => {
        let key = '';
        if (event.altKey) key += 'Alt+';
        if (event.ctrlKey) key += 'Ctrl+';
        if (event.shiftKey) key += 'Shift+';
        if (event.key === ' ') {
          key += 'Space';
        } else {
          key += event.key;
        }

        const shortcut = this.shortcuts.find(s => s.key === key);
        if (shortcut === undefined) {
          return;
        }

        let context = 'page';
        if (event.target === this.playerMedioNode) context = 'player';
        if (event.target.dataset.index !== undefined) context = 'editor';

        if (!shortcut.context.includes(context)) {
          return;
        }

        shortcut.action(event.target);

        event.preventDefault();
        event.stopPropagation();
        return false;
      }, true /* Listen to the event before it hits event targets */);
    }
  }

  ReactDOM.render(React.createElement(App), document.querySelector('#app'));

  // TODO: Check the duration and infer the least amount of components we need to use for display
  // TODO: Add support for wrapping days and displaying the number of days
  function getTimestamp(time) {
    // Note that the `time` value is assumed to be in seconds
    // Note that we could use `Math.floor(time / …) % 24` if we wanted to wrap at 24, but then we'd have to display days as well or lose information
    const hours = ('0'.repeat(2) /* Prepad to 2 */ + Math.floor(time / (60 * 60 /* Seconds to hour */)).toString()).slice(-2 /* Last two chars */);
    const minutes = ('0'.repeat(2) /* Prepad to 2 */ + (Math.floor(time / 60 /* Seconds to minute */) % 60 /* Wrap in hour */).toString()).slice(-2 /* Last 2 chars */);
    const seconds = ('0'.repeat(2) /* Prepad to 2 */ + (Math.floor(time) % 60 /* Wrap in minute */).toString()).slice(-2 /* Last 2 chars */);
    const milliseconds = ((time % 1 /* Fractional part */).toString() + '0'.repeat(3 /* Postpad to 3 */ + 1 /* If no decimal point */)).slice(2 /* After point */, 2 + 3 /* First 3 chars */);
    return `${hours}:${minutes}:${seconds}.${milliseconds}`;
  }
});
