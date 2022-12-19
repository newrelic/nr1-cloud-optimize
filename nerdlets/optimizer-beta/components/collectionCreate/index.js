import React, { useState, useContext } from 'react';
import {
  Modal,
  Spinner,
  Button,
  HeadingText,
  Card,
  BlockText,
  CardBody,
  Checkbox,
  CheckboxGroup,
  TextField,
  AccountStorageMutation,
  Toast
} from 'nr1';
import DataContext from '../../context/data';
import { v4 as uuidv4 } from 'uuid';

// eslint-disable-next-line no-unused-vars
export default function CollectionCreateModal(props) {
  const dataContext = useContext(DataContext);
  const {
    createCollectionOpen,
    selectedAccount,
    email,
    workloads,
    updateDataState,
    fetchingAccessibleWorkloads,
    fetchWorkloadCollections,
    optimizerKey,
    apiUrlDev,
    apiUrlProd,
    uuid
  } = dataContext;

  const isLocal =
    !window.location.href.includes('https://one.newrelic.com') &&
    !window.location.href.includes('https://one.eu.newrelic.com');
  const apiUrl = isLocal ? apiUrlDev : apiUrlProd;

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

    const documentId = uuidv4();

    AccountStorageMutation.mutate({
      accountId: selectedAccount.id,
      actionType: AccountStorageMutation.ACTION_TYPE.WRITE_DOCUMENT,
      collection: 'workloadCollections',
      documentId,
      document
    }).then(config => {
      // eslint-disable-next-line no-console
      console.log('wrote document', config);

      setWriteState(false);
      fetchWorkloadCollections();
      setCheckBoxValues([]);
      updateDataState({ createCollectionOpen: false });

      postData(`${apiUrl}/optimize`, optimizerKey.key, {
        workloadGuids: document.workloads.map(w => w.guid),
        accountId: selectedAccount.id,
        nerdpackUUID: uuid,
        collectionId: documentId,
        config
      }).then(data => {
        if (data?.success) {
          Toast.showToast({
            title: 'Job sent successfully',
            description: 'Processing... can take up to 15m',
            type: Toast.TYPE.NORMAL
          });
        } else {
          Toast.showToast({
            title: 'Job failed to send',
            description:
              data?.message || 'Check... console & network logs for errors',
            type: Toast.TYPE.CRITICAL
          });
        }
      });
    });
  };

  return (
    <Modal
      hidden={!createCollectionOpen}
      onClose={() => {
        setCheckBoxValues([]);
        updateDataState({ createCollectionOpen: false });
      }}
    >
      <div>
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
          onClick={() => {
            writeDocument();
          }}
        >
          Create
        </Button>
        &nbsp;
        <Button
          style={{ float: 'right' }}
          onClick={() => {
            setCheckBoxValues([]);
            updateDataState({ createCollectionOpen: false });
          }}
        >
          Close
        </Button>
      </div>
    </Modal>
  );
}

function postData(url = '', key, data = {}) {
  return new Promise(resolve => {
    fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'NR-API-KEY': key,
        'NR-REGION': (window?.location?.host || '').includes('.eu.')
          ? 'EU'
          : undefined
      },
      body: JSON.stringify(data)
    })
      .then(async response => {
        const responseData = await response.json();
        resolve(responseData);
      })
      .catch(error => {
        // eslint-disable-next-line no-console
        resolve({ success: false, error });
        resolve();
      });
  });
}
