import React, { useContext } from 'react';
import { Card, CardHeader, CardBody, HeadingText, BlockText } from 'nr1';
import DataContext from '../../context/data';

// eslint-disable-next-line no-unused-vars
export default function Messages(props) {
  const dataContext = useContext(DataContext);
  const { messages } = dataContext;

  if (!messages || messages.length === 0) {
    return <></>;
  }

  return (
    <>
      <Card collapsible style={{ fontSize: 'unset', overflow: 'hidden' }}>
        <CardHeader title="Messages" />
        <CardBody>
          {messages.map((m, i) => {
            return (
              <div key={i} style={{ paddingLeft: '20px' }}>
                <HeadingText
                  type={HeadingText.TYPE.HEADING_5}
                  style={{ paddingBottom: '10px' }}
                >
                  {m.title}
                </HeadingText>
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
