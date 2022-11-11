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
  CardHeader,
  CardBody,
  AccountStorageMutation,
  Select,
  SelectItem,
  Checkbox
} from 'nr1';

const { options } = require('./options');

function ConfigurationNerdlet() {
  const nerdletContext = useContext(NerdletStateContext);
  const { document, email, wlCollectionId, account } = nerdletContext;
  const { name } = document;
  const config = document?.config || {};
  const [formConfig, updateConfig] = useState(config);
  const suggestionsConfig = document?.suggestionsConfig || {};
  const [suggestionsFormConfig, updateSuggestionsConfig] = useState(
    suggestionsConfig
  );
  const [writingDocument, setWriteState] = useState(false);
  const [enableConfig, setEnableConfig] = useState(
    document?.enableConfig || false
  );
  const [enableSuggestionsConfig, setEnableSuggestionsConfig] = useState(
    document?.enableSuggestionsConfig || false
  );
  const [updatingConfigs, setUpdatingConfigs] = useState(false);

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
        enableConfig,
        enableSuggestionsConfig,
        config: formConfig,
        suggestionsConfig: suggestionsFormConfig
      }
    }).then(value => {
      // eslint-disable-next-line no-console
      console.log('updated config', value);
      setWriteState(false);
    });
  };

  const updateDocument = () => {
    setUpdatingConfigs(true);
    AccountStorageMutation.mutate({
      accountId: account.id,
      actionType: AccountStorageMutation.ACTION_TYPE.WRITE_DOCUMENT,
      collection: 'workloadCollections',
      documentId: wlCollectionId,
      document: {
        ...document,
        lastEditedBy: email,
        enableConfig,
        enableSuggestionsConfig,
        config: formConfig,
        suggestionsConfig: suggestionsFormConfig
      }
    }).then(value => {
      // eslint-disable-next-line no-console
      console.log('updated config', value);
      setUpdatingConfigs(false);
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

  const updateValueRecommendations = (
    valueType,
    entityType,
    key,
    value,
    defaultValue
  ) => {
    if (!suggestionsFormConfig[entityType]) {
      suggestionsFormConfig[entityType] = {};
    }

    if (valueType === 'number') {
      if (!value || !isNaN(value)) {
        suggestionsFormConfig[entityType][key] = value;
      } else {
        suggestionsFormConfig[entityType][key] = defaultValue;
      }
    } else {
      suggestionsFormConfig[entityType][key] = value;
    }

    updateSuggestionsConfig({ ...suggestionsFormConfig });
  };

  const renderConfig = () => {
    return options.map(o => {
      const configKeys = Object.keys(o.config || {});
      const suggestionsConfigKeys = Object.keys(o.suggestionsConfig || {});

      return (
        <React.Fragment key={o.type}>
          <Card collapsible>
            <CardHeader title={o.type} style={{ marginBottom: '0px' }} />

            <CardBody style={{ marginTop: '0px' }}>
              <Form
                style={{ marginLeft: '20px' }}
                className="configForm"
                layoutType={Form.LAYOUT_TYPE.SPLIT}
                splitSizeType={Form.SPLIT_SIZE_TYPE.LARGE}
              >
                {configKeys.length > 0 && (
                  <>
                    <Card collapsible>
                      <CardHeader title="Optimization Configurations" />

                      <CardBody>
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
                                    placeholder={
                                      placeholder || 'Enter a number'
                                    }
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
                                    value={
                                      formConfig?.[o.type]?.[key] ||
                                      defaultValue
                                    }
                                    onChange={e =>
                                      updateValue(
                                        'string',
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
                                    value={
                                      formConfig?.[o.type]?.[key] ||
                                      defaultValue
                                    }
                                    onChange={(e, value) =>
                                      updateValue(
                                        'enum',
                                        o.type,
                                        key,
                                        value,
                                        defaultValue
                                      )
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
                            <React.Fragment key={key}>
                              {renderFormType()}
                              <br />
                            </React.Fragment>
                          );
                        })}
                      </CardBody>
                    </Card>
                  </>
                )}

                {suggestionsConfigKeys.length > 0 && (
                  <>
                    <Card collapsible>
                      <CardHeader title="Recommendation Configurations" />

                      <CardBody style={{ marginTop: '0px' }}>
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
                                    placeholder={
                                      placeholder || 'Enter a number'
                                    }
                                    info={description || undefined}
                                    label={newLabel}
                                    value={formConfig?.[o.type]?.[key]}
                                    onChange={e =>
                                      updateValueRecommendations(
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
                                    value={
                                      formConfig?.[o.type]?.[key] ||
                                      defaultValue
                                    }
                                    onChange={e =>
                                      updateValueRecommendations(
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
                                    value={
                                      formConfig?.[o.type]?.[key] ||
                                      defaultValue
                                    }
                                    onChange={(e, value) =>
                                      updateValueRecommendations(
                                        'enum',
                                        o.type,
                                        key,
                                        value,
                                        defaultValue
                                      )
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
                            <React.Fragment key={key}>
                              {renderFormType()}
                              <br />
                            </React.Fragment>
                          );
                        })}
                      </CardBody>
                    </Card>
                  </>
                )}

                <Button
                  loading={writingDocument}
                  disabled={updatingConfigs}
                  onClick={() => writeDocument()}
                  type={Button.TYPE.PRIMARY}
                >
                  Save
                </Button>
              </Form>
            </CardBody>
          </Card>
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
                  <h2>Recommendation Configuration</h2>
                  <span style={{ fontSize: '18px', fontWeight: 'bold' }}>
                    {name}
                  </span>

                  <div style={{ paddingTop: '10px' }}>
                    <Checkbox
                      checked={enableConfig}
                      disabled={updatingConfigs}
                      onChange={() => {
                        setEnableConfig(!enableConfig);
                        updateDocument();
                      }}
                      label="Optimization Configurations"
                    />
                    <Checkbox
                      checked={enableSuggestionsConfig}
                      disabled={updatingConfigs}
                      onChange={() => {
                        setEnableSuggestionsConfig(!enableSuggestionsConfig);
                        updateDocument();
                      }}
                      label="Recommendation Configurations"
                    />
                  </div>
                  <div style={{ paddingTop: '5px' }}>
                    <span>
                      Unchecking optimization or recommendation configurations
                      will remove the respective feature from this collection's
                      future run results
                    </span>
                  </div>
                </CardBody>
              </Card>
            </StackItem>
            <StackItem grow style={{ width: '99%' }}>
              {renderConfig()}
            </StackItem>
          </Stack>
        </LayoutItem>
      </Layout>
    </div>
  );
}

export default ConfigurationNerdlet;
