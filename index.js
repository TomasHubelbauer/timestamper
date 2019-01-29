window.addEventListener('load', _ => {
  const audio = (props) => React.createElement('audio', props);
  const button = (props, ...children) => React.createElement('button', props, ...children);
  const div = (props, ...children) => React.createElement('div', props, ...children);
  const h1 = (props, ...children) => React.createElement('h1', props, ...children);
  const hr = (props) => React.createElement('hr', props);
  const input = (props) => React.createElement('input', props);
  const progress = (props) => React.createElement('progress', props);
  const span = (props, ...children) => React.createElement('span', props, ...children);

  class App extends React.Component {
    constructor(props) {
      super(props);
      this.state = {
        stamps: [],
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
        if (this.state.stamps.length > 0 && !confirm('Do you really want to abandon the existing collected timestamps?')) {
          return;
        }
    
        // Note that assigning `File` (which is a `Blob`) directly to `srcObject` is not supported in browsers yet (but is in the specification)
        this.setState({ media: { type: match[1], src: URL.createObjectURL(file), name: file.name } });
        
        // See if we have persisted any stamps for the file being opened
        const stamps = localStorage.getItem(`timestamper-${file.name}`);
        if (stamps !== null) {
          this.setState({ stamps: JSON.parse(stamps) });
        }
      };

      this.onStopButtonClick = _ => {
        this.setState({ snippet: undefined });
        this.playerMedioNode.pause();
        this.playerMedioNode.currentTime = 0;
      };

      this.playerMedioRef = node => {
        this.playerMedioNode = node;
        if (node === null) {
          // Collect the existing URL to prevent memory leaks
          URL.revokeObjectURL(this.state.src);
        }
      };

      this.onHelpButtonClick = _ => {
        alert(this.shortcuts.map(shortcut => shortcut.key + '\n    ' + shortcut.title + '\n').join('\n'));
      };

      this.onTimeStartButtonClick = _ => {
        const stamp = { startTime: this.playerMedioNode.currentTime, text: '' };
        // Sort the stamps to always be chronological no matter the order they were entered in
        this.setState(state => ({ stamps: [...state.stamps, stamp].sort((a, b) => a.time - b.time) }), this.persistStamps);
      };

      this.onTimeEndButtonClick = _ => {
        this.setState(state => {
          const stamp = state.stamps.filter(s => s.endTime === undefined && s.startTime < this.playerMedioNode.currentTime)[0];
          const index = state.stamps.indexOf(stamp);
          return { stamps: [...state.stamps.map((s, i) => i === index ? { ...s, endTime: this.playerMedioNode.currentTime } : s)] };
        }, this.persistStamps);
      };

      this.onSpeedInputChange= event => {
        this.playerMedioNode.playbackRate = event.currentTarget.value;
      };

      this.onSaveButtonClick = _ => {
        const downloadA = document.createElement('a');
        downloadA.download = this.state.media.name + '.stamps';
        downloadA.href = `data:application/json;charset=utf8,` + encodeURIComponent(JSON.stringify({ name: this.state.media.name, stamps: this.state.stamps }, null, 2));
        document.body.appendChild(downloadA);
        downloadA.click();
        downloadA.remove();
      };

      this.onLoopButtonClick = event => {
        const index = Number(event.currentTarget.dataset.index);
        const stamp = this.state.stamps[index];
        this.setState({ snippet: { stampIndex: index, loop: true } });
        this.playerMedioNode.currentTime = stamp.startTime;
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
        this.setState(state => ({ stamps: [...state.stamps.map((stamp, i) => i === index ? { ...stamp, text } : stamp)] }), this.persistStamps);
      };

      this.onTextInputClick = event => {
        const index = Number(event.currentTarget.dataset.index);
        const stamp = this.state.stamps[index];
        this.setState({ snippet: { stampIndex: index } }, () => {
          this.playerMedioNode.currentTime = stamp.startTime;
          this.playerMedioNode.play();
        });
      };

      this.onDeleteButtonClick = event => {
        const index = Number(event.currentTarget.dataset.index);
        this.setState(state => ({ stamps: [...state.stamps.filter((_, i) => i !== index)] }), this.persistStamps);
      };

      this.shortcuts = [
        { key: 'Space', title: 'Toggle playback', context: ['page', 'player'], action: () => this.playerMedioNode.paused ? this.playerMedioNode.play() : this.playerMedioNode.pause() },
        { key: 'Enter', id: 'open', title: 'Open a new stamp', context: ['page', 'player', 'editor'], action: this.onTimeStartButtonClick },
        { key: 'Escape', id: 'close', title: 'Close longest open stamp prior to current time', context: ['page', 'player', 'editor'], action: this.onTimeEndButtonClick },
        { key: 'Ctrl+ArrowUp', title: 'Speed up the playback', context: ['page', 'player', 'editor'], action: () => this.playerMedioNode.playbackRate += .1 },
        { key: 'Ctrl+ArrowDown', title: 'Slow down the playback', context: ['page', 'player', 'editor'], action: () => this.playerMedioNode.playbackRate -= .1 },
        { key: 'ArrowUp', title: 'Go to the above text editor', context: ['editor'], action: (editorInput) => {
          const above = document.querySelector(`input[data-index="${Math.max(0, Number(editorInput.dataset.index) - 1)}"]`);
          above.focus();
          above.click();
        } },
        { key: 'ArrowDown', title: 'Go to the below text editor', context: ['editor'], action: (editorInput) => {
          const below = document.querySelector(`input[data-index="${Math.min(this.state.stamps.length - 1, Number(editorInput.dataset.index) + 1)}"]`);
          below.focus();
          below.click();
        } },
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
      return div({},
        h1({}, 'Timestamper', this.state.media && ' - ' + this.state.media.name),
        input({ type: 'file', accept: 'audio/*,video/*', onChange: this.onMediaInputChange }),
        // Prevent the audio/video from taking focus with negative tab index in order not to break the Enter & Space keyboard shortcuts
        // Mind the audio/video ID as it is used for styling
        this.state.media && this.getPlayer(this.state.media.type)({ controls: true, tabIndex: -1, id: 'mediaMedio', ref: this.playerMedioRef, src: this.state.media.src }),
        this.playerMedioNode && div({ id: 'previewDiv' },
          this.state.snippet !== undefined && div({},
            `${this.state.snippet.loop ? 'Looping' : 'Playing'} a snippet of a stamp #${this.state.snippet.stampIndex}`,
            this.state.stamps[this.state.snippet.stampIndex].text && ` "${this.state.stamps[this.state.snippet.stampIndex].text}"`,
            this.renderRange(this.state.stamps[this.state.snippet.stampIndex]),
          ),
          this.playerMedioNode && this.state.stamps
            .filter(stamp => stamp.startTime < this.playerMedioNode.currentTime && stamp.endTime > this.playerMedioNode.currentTime)
            .map((stamp, index) => div({ key: index },
              stamp.text || this.renderRange(stamp),
              stamp.endTime && progress({ max: stamp.endTime - stamp.startTime, value: this.playerMedioNode.currentTime - stamp.startTime }),
            )),
        ),
        this.playerMedioNode && hr(),
        this.playerMedioNode && div({ id: 'editorDiv' },
          span({ id: 'timeSpan', className: 'timeSpan' }, getTimestamp(this.playerMedioNode.currentTime)),
          button({ onClick: this.onTimeStartButtonClick, title: this.getShortcut('open') }, 'Time start'),
          button({ onClick: this.onTimeEndButtonClick, title: this.getShortcut('close') }, 'Time end'),
          'Speed:',
          input({ type: 'range', min: .25, max: 1.5, step: .01, value: this.playerMedioNode.playbackRate, onChange: this.onSpeedInputChange }),
          this.playerMedioNode.playbackRate.toFixed(2),
          button({ id: 'saveButton', onClick: this.onSaveButtonClick }, 'Save'),
          button({ onClick: this.onHelpButtonClick }, 'Help'),
        ),
        this.playerMedioNode && hr(),
        this.state.stamps.map((stamp, index) => {
          return div({ key: index },
            div({ className: 'stampDiv' },
              this.state.snippet && this.state.snippet.stampIndex === index
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
              button({ 'data-index': index, onClick: this.onDeleteButtonClick }, 'Delete'),
            ),
            input({ className: 'stampInput', value: stamp.text, 'data-index': index, onChange: this.onTextInputChange, onClick: this.onTextInputClick }),
          );
        }),
      );
    }

    moveStartTime(index, delta) {
      this.setState(
        state => ({
          snippet: { stampIndex: index, loop: state.snippet && state.snippet.loop },
          stamps: [...state.stamps.map((stamp, i) => i === index ? { ...stamp, startTime: stamp.startTime + delta } : stamp)],
        }),
        () => {
          this.playerMedioNode.currentTime = this.state.stamps[index].startTime;
          this.playerMedioNode.play();
        }
      );
    }

    moveEndTime(index, delta) {
      this.setState(
        state => ({
          snippet: { stampIndex: index, loop: state.snippet && state.snippet.loop },
          stamps: [...state.stamps.map((stamp, i) => i === index ? { ...stamp, endTime: stamp.endTime ? stamp.endTime + delta : undefined } : stamp)],
        }),
        () => {
          this.playerMedioNode.currentTime = this.state.stamps[index].startTime;
          this.playerMedioNode.play();
        }
      );
    }

    getShortcut(id) {
      const shortcut = this.shortcuts.find(s => s.id === id);
      return `${shortcut.title} (${shortcut.key})`;
    }

    getPlayer(type) {
      if (type === 'audio') return audio;
      if (type === 'video') return video;
      throw new Error(`Unexpected media type ${type}. Expected 'audio' or 'video'.`);
    }

    renderRange(stamp) {
      if (stamp.endTime !== undefined) {
        return ` between ${getTimestamp(stamp.startTime)} and ${getTimestamp(stamp.endTime)}.`;
      }

      return ` from ${getTimestamp(stamp.startTime)}.`;
    }

    componentDidMount() {
      // Focus the text input of the pivot stamp
      if (this.state.pivotStampIndex !== undefined) {
        document.querySelector(`input[data-index="${pivotStampIndex}"]`).focus();
      }

      // Note that `timeupdate` is too infrequent (Firefox ~300 ms, Chrome ~200 ms, Safari N/A) so we use RAF instead
      const raf = () => {
        this.forceUpdate();

        if (this.state.snippet !== undefined) {
          const stamp = this.state.stamps[this.state.snippet.stampIndex];

          if (this.state.snippet.loop) {
            // Confine the playback range to the start and end (if any) time of the stamp
            if (stamp.startTime > this.playerMedioNode.currentTime || this.playerMedioNode.currentTime > stamp.endTime) {
              this.playerMedioNode.currentTime = stamp.startTime;
            }
          } else {
            // Reset snippet if scrubbed before it to replay, stop previewing it when it ends
            if (stamp.startTime > this.playerMedioNode.currentTime) {
              this.playerMedioNode.currentTime = stamp.startTime;
            } else if (this.playerMedioNode.currentTime > stamp.endTime) {
              this.playerMedioNode.pause();
              this.playerMedioNode.currentTime = stamp.startTime;
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

    persistStamps() {
      // Persist the stamps in local storage to recall in case the same song gets opened again
      localStorage.setItem(`timestamper-${this.state.name}`, JSON.stringify(this.state.stamps));
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
