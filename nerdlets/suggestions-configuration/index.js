import React, { useContext, useState } from 'react';
import {
  Button,
  NerdletStateContext,
  Stack,
  StackItem,
  Layout,
  LayoutItem,
  Form,
  TextField,
  Card,
  CardBody,
  AccountStorageMutation,
  Select,
  SelectItem
} from 'nr1';

const { options } = require('./options');

function ConfigurationNerdlet() {
  const nerdletContext = useContext(NerdletStateContext);
  const { document, email, wlCollectionId, account } = nerdletContext;
  const { name } = document;
  const suggestionsConfig = document?.suggestionsConfig || {};
  const [formConfig, updateConfig] = useState(suggestionsConfig);
  const [writingDocument, setWriteState] = useState(false);
  console.log(window.location.href); // eslint-disable-line no-console

  const writeDocument = () => {
    setWriteState(true);
    AccountStorageMutation.mutate({
      accountId: account.id,
      actionType: AccountStorageMutation.ACTION_TYPE.WRITE_DOCUMENT,
      collection: 'workloadCollections',
      documentId: wlCollectionId,
      document: {
        ...document,
        lastEditedBy: email,
        suggestionsConfig: formConfig
      }
    }).then(value => {
      // eslint-disable-next-line no-console
      console.log('updated suggestionsConfig', value);
      setWriteState(false);
    });
  };

  // lastReportPeriod: HOST?.lastReportPeriod || 24,
  // inclusionPeriodHours: HOST?.inclusionPeriodHours || 24,

  const updateValue = (valueType, entityType, key, value, defaultValue) => {
    if (!formConfig[entityType]) {
      formConfig[entityType] = {};
    }

    if (valueType === 'number') {
      if (!value || !isNaN(value)) {
        formConfig[entityType][key] = value;
      } else {
        formConfig[entityType][key] = defaultValue;
      }
    } else {
      formConfig[entityType][key] = value;
    }

    updateConfig({ ...formConfig });
  };

  const renderConfig = () => {
    return options.map(o => {
      const suggestionsConfigKeys = Object.keys(o.suggestionsConfig);
      return (
        <React.Fragment key={o.type}>
          <Form
            className="configForm"
            layoutType={Form.LAYOUT_TYPE.SPLIT}
            splitSizeType={Form.SPLIT_SIZE_TYPE.LARGE}
          >
            <h4 style={{ paddingBottom: '10px' }}>{o.type}</h4>

            {suggestionsConfigKeys.map(key => {
              const {
                label,
                description,
                type,
                defaultValue,
                items,
                placeholder
              } = o.suggestionsConfig[key];

              const newLabel = `${label} ${
                defaultValue ? `(Default: ${defaultValue})` : ''
              }`;

              const renderFormType = () => {
                switch (type) {
                  case 'number':
                    return (
                      <TextField
                        placeholder={placeholder || 'Enter a number'}
                        info={description || undefined}
                        label={newLabel}
                        value={formConfig?.[o.type]?.[key]}
                        onChange={e =>
                          updateValue(
                            'number',
                            o.type,
                            key,
                            e.target.value,
                            defaultValue
                          )
                        }
                      />
                    );
                  case 'string':
                    return (
                      <TextField
                        placeholder={placeholder || undefined}
                        info={description || undefined}
                        label={newLabel}
                        value={formConfig?.[o.type]?.[key] || defaultValue}
                        onChange={e =>
                          updateValue(
                            'number',
                            o.type,
                            key,
                            e.target.value,
                            defaultValue
                          )
                        }
                      />
                    );
                  case 'enum':
                    return (
                      <Select
                        info={description || undefined}
                        label={newLabel}
                        value={formConfig?.[o.type]?.[key] || defaultValue}
                        onChange={(e, value) =>
                          updateValue('enum', o.type, key, value, defaultValue)
                        }
                      >
                        {items.map((item, ii) => {
                          return (
                            <SelectItem key={ii} value={item.value}>
                              {item.title}
                            </SelectItem>
                          );
                        })}
                      </Select>
                    );
                  default:
                    return `Unknown type ${type}`;
                }
              };

              return (
                <React.Fragment key={key}>{renderFormType()}</React.Fragment>
              );
            })}
            <Button
              style={{ marginBottom: '15px' }}
              loading={writingDocument}
              onClick={() => writeDocument()}
              type={Button.TYPE.PRIMARY}
              sizeType={Button.SIZE_TYPE.SMALL}
            >
              Save
            </Button>
          </Form>
        </React.Fragment>
      );
    });
  };

  return (
    <div
      style={{
        paddingLeft: '10px',
        paddingTop: '10px',
        backgroundColor: '#F3F4F4',
        height: '100%'
      }}
    >
      <Layout fullHeight>
        <LayoutItem>
          <Stack directionType={Stack.DIRECTION_TYPE.VERTICAL} fullWidth>
            <StackItem grow style={{ width: '99%' }}>
              <Card>
                <CardBody>
                  <h2>{name} - Suggestions Configuration</h2>
                </CardBody>
              </Card>
            </StackItem>
            <StackItem grow style={{ width: '99%' }}>
              <Card>
                <CardBody>{renderConfig()}</CardBody>
              </Card>
            </StackItem>
          </Stack>
        </LayoutItem>
      </Layout>
    </div>
  );
}

export default ConfigurationNerdlet;
