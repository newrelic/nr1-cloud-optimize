import React from 'react';
import { Modal, HeadingText, BlockText, Button } from 'nr1';

export default class CostModal extends React.PureComponent {
  render() {
    const { hidden, onClose, messages } = this.props;

    return (
      <Modal hidden={hidden} onClose={onClose}>
        <HeadingText type={HeadingText.TYPE.HEADING_1}>Calculation</HeadingText>

        {messages.map((msg, i) => {
          return (
            <BlockText key={i} type={BlockText.TYPE.PARAGRAPH}>
              {msg}
            </BlockText>
          );
        })}

        <Button onClick={onClose}>Close</Button>
      </Modal>
    );
  }
}
