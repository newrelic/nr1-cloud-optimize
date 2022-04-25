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

function ConfigurationNerdlet() {
  const nerdletContext = useContext(NerdletStateContext);
  const { document, email, wlCollectionId, account } = nerdletContext;
  const { name } = document;
  const config = document?.config || {};
  const [formConfig, updateConfig] = useState(config);
  const [writingDocument, setWriteState] = useState(false);

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
        config: formConfig
      }
    }).then(value => {
      // eslint-disable-next-line no-console
      console.log('updated config', value);
      setWriteState(false);
    });
  };

  const options = [
    {
      type: 'HOST',
      config: {
        cpuRightSize: {
          label: 'CPU Right Size',
          description:
            'If a suggestion is to be provided multiple the cpu count by this value',
          type: 'number',
          defaultValue: 0.5
        },
        memRightSize: {
          label: 'Memory Right Size',
          description:
            'If a suggestion is to be provided multiple the memory by this value',
          type: 'number',
          defaultValue: 0.5
        },

        cpuUpper: {
          label: 'CPU Upper Percent',
          description: 'If cpu below this value request an optimization',
          type: 'number',
          defaultValue: 50
        },
        memUpper: {
          label: 'Memory Upper Percent',
          description: 'If memory below this value request an optimization',
          type: 'number',
          defaultValue: 50
        },
        cpuMemUpperOperator: {
          label: 'CPU & Memory Upper Limit Operator',
          description:
            'If both or one of these values are met request an optimization',
          type: 'enum',
          defaultValue: 'AND',
          items: [
            { title: 'AND', value: 'AND' },
            { title: 'OR', value: 'OR' }
          ]
        },
        staleCpu: {
          label: 'CPU Stale Percent',
          description: 'If cpu below this value consider stale',
          type: 'number',
          defaultValue: 5
        },
        staleMem: {
          label: 'Memory Upper Percent',
          description: 'If memory below this value consider stale',
          type: 'number',
          defaultValue: 5
        },
        cpuMemUpperStaleOperator: {
          label: 'CPU & Memory Stale Operator',
          description: 'If both or one of these values are met consider stale',
          type: 'enum',
          defaultValue: 'AND',
          items: [
            { title: 'AND', value: 'AND' },
            { title: 'OR', value: 'OR' }
          ]
        },
        staleReceiveBytesPerSec: {
          label: 'Receieve Bytes Per Sec Staleness',
          description:
            'If receive bytes per sec below this value consider stale',
          type: 'number',
          defaultValue: 5
        },
        staleTransmitBytesPerSec: {
          label: 'Transmit Bytes Per Sec Staleness',
          description:
            'If transmit bytes per sec below this value consider stale',
          type: 'number',
          defaultValue: 5
        },
        rxTxStaleOperator: {
          label: ' Recieve & Transmit Stale Operator',
          description: 'If both or one of these values are met consider stale',
          type: 'enum',
          defaultValue: 'AND',
          items: [
            { title: 'AND', value: 'AND' },
            { title: 'OR', value: 'OR' }
          ]
        },
        includedInstanceTypes: {
          label: 'Included Instance Types',
          description:
            'Only return instances that are matched from this comma separated list',
          type: 'string',
          defaultValue: '',
          placeholder: 'Enter a comma separated list'
        },
        excludedInstanceTypes: {
          label: 'Excluded Instance Types',
          description:
            'Do not return instances that are matched from this comma separated list',
          type: 'string',
          defaultValue: '',
          placeholder: 'Enter a comma separated list'
        }
      }
    }
  ];

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
      const configKeys = Object.keys(o.config);
      return (
        <React.Fragment key={o.type}>
          <Form
            className="configForm"
            layoutType={Form.LAYOUT_TYPE.SPLIT}
            splitSizeType={Form.SPLIT_SIZE_TYPE.LARGE}
          >
            <h4 style={{ paddingBottom: '10px' }}>{o.type}</h4>

            {configKeys.map(key => {
              const {
                label,
                description,
                type,
                defaultValue,
                items,
                placeholder
              } = o.config[key];

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
              loading={writingDocument}
              onClick={() => writeDocument()}
              type={Button.TYPE.PRIMARY}
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
