import React, { useContext } from 'react';
import { Card, CardBody, UserStorageMutation, BlockText, Button } from 'nr1';
import DataContext from '../../context/data';

// eslint-disable-next-line no-unused-vars
export default function Messages(props) {
  const dataContext = useContext(DataContext);
  const { messages, userConfig, getUserConfig } = dataContext;

  const dismissMessage = async id => {
    if (!userConfig.dismissed) userConfig.dismissed = [];
    userConfig.dismissed.push(id);
    await UserStorageMutation.mutate({
      actionType: UserStorageMutation.ACTION_TYPE.WRITE_DOCUMENT,
      collection: 'USER_CONFIG',
      documentId: 'config',
      document: userConfig
    });
    getUserConfig();
  };

  const checkMessages = (userConfig, message) => {
    const dismissed = userConfig?.dismissed || [];
    for (let z = 0; z < dismissed.length; z++) {
      if (message.id === dismissed[z] || message.title === dismissed[z]) {
        return false;
      }
    }
    return true;
  };

  const filteredMessages = messages.filter(m => checkMessages(userConfig, m));

  if (!userConfig || !filteredMessages || filteredMessages.length === 0) {
    return <></>;
  }

  return (
    <>
      <Card
        style={{
          fontSize: 'unset',
          overflow: 'hidden',
          backgroundColor: '#F1F7FF',
          margin: '15px'
        }}
      >
        <CardBody>
          <h4 style={{ paddingBottom: '10px', fontWeight: 'bold' }}>
            Messages
          </h4>

          {filteredMessages.map((m, i) => {
            return (
              <div key={i} style={{ paddingLeft: '20px', paddingTop: '10px' }}>
                <h4 style={{ paddingBottom: '10px' }}>
                  <span>{m.title}</span>&nbsp;{' '}
                  <Button
                    style={{ marginTop: '-1px' }}
                    sizeType={Button.SIZE_TYPE.SMALL}
                    type={Button.TYPE.PLAIN}
                    onClick={() => dismissMessage(m.id || m.title)}
                  >
                    Dismiss
                  </Button>
                </h4>

                <div style={{ paddingLeft: '30px', fontSize: '14px' }}>
                  <ul>
                    {m.messages.map((msg, m) => (
                      <li key={m} type={BlockText.TYPE.PARAGRAPH}>
                        {msg}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            );
          })}
        </CardBody>
      </Card>
    </>
  );
}
