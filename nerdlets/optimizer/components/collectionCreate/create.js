import React, { useState, useContext } from 'react';
import { v4 as uuidv4 } from 'uuid';
import {
  Spinner,
  Button,
  HeadingText,
  Card,
  BlockText,
  CardBody,
  Checkbox,
  CheckboxGroup,
  TextField,
  AccountStorageMutation
} from 'nr1';
import DataContext from '../../context/data';

// eslint-disable-next-line no-unused-vars
export default function CollectionCreate(props) {
  const dataContext = useContext(DataContext);
  const {
    selectedAccount,
    email,
    workloads,
    updateDataState,
    fetchingAccessibleWorkloads,
    fetchWorkloadCollections
  } = dataContext;

  const [writingDocument, setWriteState] = useState(false);
  const [name, setName] = useState('');
  const [searchText, setSearch] = useState('');
  const [checkboxValues, setCheckBoxValues] = useState([]);
  const filteredWorkloads = workloads.filter(w =>
    w.name.toLowerCase().includes(searchText.toLocaleLowerCase())
  );

  const writeDocument = () => {
    setWriteState(true);
    const filteredWorkloads = workloads
      .filter(w => checkboxValues.includes(w.guid))
      .map(w => ({
        account: { id: w.account.id, name: w.account.name },
        guid: w.guid,
        name: w.name,
        tags: w.tags
      }));
    const document = {
      name,
      workloads: filteredWorkloads,
      createdBy: email,
      lastEditedBy: email
    };

    AccountStorageMutation.mutate({
      accountId: selectedAccount.id,
      actionType: AccountStorageMutation.ACTION_TYPE.WRITE_DOCUMENT,
      collection: 'workloadCollections',
      documentId: uuidv4(),
      document
    }).then(value => {
      // eslint-disable-next-line no-console
      console.log('wrote document', value);

      setWriteState(false);
      fetchWorkloadCollections();
      updateDataState({ createCollectionOpen: false });
    });
  };

  return (
    <>
      <HeadingText
        type={HeadingText.TYPE.HEADING_3}
        style={{ fontSize: '18px' }}
      >
        Create Collection
      </HeadingText>
      <BlockText type={BlockText.TYPE.PARAGRAPH}>
        Select the workloads you would like to target for optimization.
      </BlockText>
      <TextField
        style={{ width: '100%', paddingBottom: '15px' }}
        label="Name"
        placeholder="eg. Production"
        value={name}
        onChange={e => setName(e.target.value)}
      />
      {fetchingAccessibleWorkloads ? (
        <>
          <Spinner type={Spinner.TYPE.DOT} />
          &nbsp;Fetching workloads...
        </>
      ) : (
        <>
          <TextField
            type={TextField.TYPE.SEARCH}
            style={{ width: '100%', paddingBottom: '5px' }}
            placeholder="Search workloads..."
            value={searchText}
            onChange={e => setSearch(e.target.value)}
          />
          <Card style={{ maxHeight: '300px' }}>
            <CardBody>
              <CheckboxGroup
                value={checkboxValues}
                onChange={(e, v) => setCheckBoxValues(v)}
              >
                {filteredWorkloads.map(w => (
                  <Checkbox
                    key={w.guid}
                    label={`${w.name} - (${w.account.name}:${w.account.id})`}
                    value={w.guid}
                  />
                ))}
              </CheckboxGroup>
            </CardBody>
          </Card>
          <Card>
            <CardBody>
              {checkboxValues.length} / {filteredWorkloads.length} workloads
              selected
            </CardBody>
          </Card>
        </>
      )}
      <br />
      <Button
        loading={writingDocument}
        type={Button.TYPE.PRIMARY}
        disabled={checkboxValues.length === 0 || !name.trim()}
        onClick={() => writeDocument()}
      >
        Create
      </Button>
      &nbsp;
      <Button
        style={{ float: 'right' }}
        onClick={() => updateDataState({ createCollectionOpen: false })}
      >
        Close
      </Button>
    </>
  );
}
