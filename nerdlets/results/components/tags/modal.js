import React, { useContext } from 'react';
import DataContext from '../../context/data';
import {
  Button,
  BlockText,
  HeadingText,
  Modal,
  CardSectionBody,
  Checkbox,
  Card,
  CardSectionHeader,
  CardBody,
  CardSection
} from 'nr1';

// eslint-disable-next-line no-unused-vars
export default function TagModal(props) {
  const dataContext = useContext(DataContext);
  const {
    tagModalOpen,
    updateDataState,
    entityTags,
    selectedTags,
    recalculate
  } = dataContext;

  return (
    <>
      <Modal
        hidden={!tagModalOpen}
        onClose={() => updateDataState({ tagModalOpen: false })}
      >
        <HeadingText
          style={{ fontSize: '18px' }}
          type={HeadingText.TYPE.HEADING_3}
        >
          Filter Tags
        </HeadingText>

        <BlockText>
          Entities that match any of the selected tags will only be returned.
        </BlockText>

        <br />

        <Card>
          <CardBody>
            {Object.keys(entityTags).map(t => {
              const updateTags = async (key, value) => {
                if (!selectedTags[t]) {
                  selectedTags[t] = {};
                }
                if (!value) {
                  delete selectedTags[t][key];
                } else {
                  selectedTags[t][key] = value;
                }

                if (Object.keys(selectedTags[t]).length === 0) {
                  delete selectedTags[t];
                }

                await updateDataState({ selectedTags });
                recalculate();
              };

              return (
                <React.Fragment key={t}>
                  <CardSection collapsible>
                    <CardSectionHeader title={t} />
                    <CardSectionBody>
                      {entityTags[t].map(v => (
                        <Checkbox
                          key={v}
                          label={v}
                          checked={selectedTags?.[t]?.[v] === true}
                          onChange={e => updateTags(v, e.target.checked)}
                        />
                      ))}
                    </CardSectionBody>
                  </CardSection>
                </React.Fragment>
              );
            })}
          </CardBody>
        </Card>

        <Button
          style={{ float: 'right' }}
          onClick={async () => {
            await updateDataState({ tagModalOpen: false, selectedTags: {} });
            recalculate();
          }}
          type={Button.TYPE.DESTRUCTIVE}
        >
          Clear
        </Button>
      </Modal>
    </>
  );
}
