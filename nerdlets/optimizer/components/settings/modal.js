import React, { useContext } from 'react';
import DataContext from '../../context/data';
import { Switch, HeadingText, Modal, Card, CardBody } from 'nr1';

// eslint-disable-next-line no-unused-vars
export default function SettingsModal(props) {
  const dataContext = useContext(DataContext);
  const { settingsModalOpen, updateDataState, obfuscate } = dataContext;

  return (
    <>
      <Modal
        hidden={!settingsModalOpen}
        onClose={() => updateDataState({ settingsModalOpen: false })}
      >
        <HeadingText
          style={{ fontSize: '18px' }}
          type={HeadingText.TYPE.HEADING_3}
        >
          Settings
        </HeadingText>

        <br />

        <Card>
          <CardBody>
            <Switch
              checked={obfuscate}
              label="Obfuscate data (beta)"
              onChange={() => updateDataState({ obfuscate: !obfuscate })}
            />
          </CardBody>
        </Card>
      </Modal>
    </>
  );
}
