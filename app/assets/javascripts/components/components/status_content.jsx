import ImmutablePropTypes from 'react-immutable-proptypes';
import PureRenderMixin from 'react-addons-pure-render-mixin';
import escapeTextContentForBrowser from 'escape-html';
import emojify from '../emoji';
import { isRtl } from '../rtl';
import { FormattedMessage } from 'react-intl';
import Permalink from './permalink';

const StatusContent = React.createClass({

  contextTypes: {
    router: React.PropTypes.object
  },

  propTypes: {
    status: ImmutablePropTypes.map.isRequired,
    onClick: React.PropTypes.func
  },

  getInitialState () {
    return {
      hidden: true
    };
  },

  mixins: [PureRenderMixin],

  componentDidMount () {
    const node  = ReactDOM.findDOMNode(this);
    const links = node.querySelectorAll('a');

    for (var i = 0; i < links.length; ++i) {
      let link    = links[i];
      let mention = this.props.status.get('mentions').find(item => link.href === item.get('url'));
      let media   = this.props.status.get('media_attachments').find(item => link.href === item.get('text_url') || (item.get('remote_url').length > 0 && link.href === item.get('remote_url')));

      if (mention) {
        link.addEventListener('click', this.onMentionClick.bind(this, mention), false);
        link.setAttribute('title', mention.get('acct'));
      } else if (link.textContent[0] === '#' || (link.previousSibling && link.previousSibling.textContent && link.previousSibling.textContent[link.previousSibling.textContent.length - 1] === '#')) {
        link.addEventListener('click', this.onHashtagClick.bind(this, link.text), false);
      } else if (media) {
        link.innerHTML = '<i class="fa fa-fw fa-photo"></i>';
      } else {
        link.setAttribute('target', '_blank');
        link.setAttribute('rel', 'noopener');
      }
    }
  },

  onMentionClick (mention, e) {
    if (e.button === 0) {
      e.preventDefault();
      this.context.router.push(`/accounts/${mention.get('id')}`);
    }
  },

  onHashtagClick (hashtag, e) {
    hashtag = hashtag.replace(/^#/, '').toLowerCase();

    if (e.button === 0) {
      e.preventDefault();
      this.context.router.push(`/timelines/tag/${hashtag}`);
    }
  },

  handleMouseDown (e) {
    this.startXY = [e.clientX, e.clientY];
  },

  handleMouseUp (e) {
    const [ startX, startY ] = this.startXY;
    const [ deltaX, deltaY ] = [Math.abs(e.clientX - startX), Math.abs(e.clientY - startY)];

    if (e.target.localName === 'a' || (e.target.parentNode && e.target.parentNode.localName === 'a')) {
      return;
    }

    if (deltaX + deltaY < 5 && e.button === 0) {
      this.props.onClick();
    }

    this.startXY = null;
  },

  handleSpoilerClick (e) {
    e.preventDefault();
    this.setState({ hidden: !this.state.hidden });
  },

  render () {
    const { status } = this.props;
    const { hidden } = this.state;

    // How the Regex below works:
    // [eE] <- any of the fifth glyph
    // (?!  <- That does not match
    // [^\<]* <- A bunch of things that are not a <
    // \>)  <- Followed by a >
    //
    // gets replaced by "*"

    const content = { __html: emojify(status.get('content')).replace(/\n/g, '').replace(new RegExp("[eE](?![^\<]*\>)", "g"), "*") };
    const spoilerContent = { __html: emojify(escapeTextContentForBrowser(status.get('spoiler_text', ''))).replace(new RegExp("[eE](?![^\<]*\>)", "g"), "*") };
    const directionStyle = { direction: 'ltr' };

    if (isRtl(status.get('content'))) {
      directionStyle.direction = 'rtl';
    }

    if (status.get('spoiler_text').length > 0) {
      let mentionsPlaceholder = '';

      const mentionLinks = status.get('mentions').map(item => (
        <Permalink to={`/accounts/${item.get('id')}`} href={item.get('url')} key={item.get('id')} className='mention'>
          @<span>{item.get('username')}</span>
        </Permalink>
      )).reduce((aggregate, item) => [...aggregate, item, ' '], [])

      const toggleText = hidden ? <FormattedMessage id='status.show_more' defaultMessage='Show more' /> : <FormattedMessage id='status.show_less' defaultMessage='Show less' />;

      if (hidden) {
        mentionsPlaceholder = <div>{mentionLinks}</div>;
      }

      return (
        <div className='status__content' style={{ cursor: 'pointer' }} onMouseDown={this.handleMouseDown} onMouseUp={this.handleMouseUp}>
          <p style={{ marginBottom: hidden && status.get('mentions').size === 0 ? '0px' : '' }} >
            <span dangerouslySetInnerHTML={spoilerContent} />  <a className='status__content__spoiler-link' onClick={this.handleSpoilerClick}>{toggleText}</a>
          </p>

          {mentionsPlaceholder}

          <div style={{ display: hidden ? 'none' : 'block', ...directionStyle }} dangerouslySetInnerHTML={content} />
        </div>
      );
    } else if (this.props.onClick) {
      return (
        <div
          className='status__content'
          style={{ cursor: 'pointer', ...directionStyle }}
          onMouseDown={this.handleMouseDown}
          onMouseUp={this.handleMouseUp}
          dangerouslySetInnerHTML={content}
        />
      );
    } else {
      return (
        <div
          className='status__content'
          style={{ ...directionStyle }}
          dangerouslySetInnerHTML={content}
        />
      );
    }
  },

});

export default StatusContent;
