import React, { useState, useContext, useEffect } from 'react';
import {
  Spinner,
  Button,
  HeadingText,
  Card,
  CardBody,
  Checkbox,
  CheckboxGroup,
  TextField,
  AccountStorageMutation
} from 'nr1';
import DataContext from '../../context/data';

// eslint-disable-next-line no-unused-vars
export default function CollectionEdit(props) {
  const dataContext = useContext(DataContext);
  const {
    selectedAccount,
    email,
    workloads,
    updateDataState,
    fetchingAccessibleWorkloads,
    fetchWorkloadCollections,
    editCollectionId,
    accountCollection
  } = dataContext;

  const [writingDocument, setWriteState] = useState(false);
  const [name, setName] = useState('');
  const [searchText, setSearch] = useState('');
  const [checkboxValues, setCheckBoxValues] = useState([]);
  const filteredWorkloads = workloads.filter(w =>
    w.name.toLowerCase().includes(searchText.toLocaleLowerCase())
  );

  useEffect(() => {
    const foundCollection = (accountCollection || []).find(
      a => a.id === editCollectionId
    );

    if (foundCollection) {
      const { document } = foundCollection;
      const values = document.workloads.map(w => w.guid);
      setName(document.name);
      setCheckBoxValues(values);
    }
  }, [editCollectionId]);

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
      documentId: editCollectionId,
      document
    }).then(value => {
      // eslint-disable-next-line no-console
      console.log('updated document', value);

      setWriteState(false);
      fetchWorkloadCollections();
      updateDataState({ editCollectionOpen: false });
    });
  };

  return (
    <>
      <HeadingText type={HeadingText.TYPE.HEADING_3}>
        Edit Collection
      </HeadingText>
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
        Edit
      </Button>
      &nbsp;
      <Button
        style={{ float: 'right' }}
        onClick={() => updateDataState({ editCollectionOpen: false })}
      >
        Close
      </Button>
    </>
  );
}
