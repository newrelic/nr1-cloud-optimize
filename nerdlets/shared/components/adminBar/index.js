import React, { useEffect, useState, useContext } from 'react';
import { UserStorageMutation, Button, NerdGraphQuery } from 'nr1';

function AdminBar(props) {
  const [hide, setHide] = useState(false);
  const [email, setEmail] = useState(null);
  const { DataContext } = props;
  const dataContext = useContext(DataContext);
  const { getUserConfig } = dataContext;

  useEffect(async () => {
    const emailData = await NerdGraphQuery.query({
      query: `{
      actor {
        user {
          email
        }
      }
    }`
    });

    setEmail(emailData?.data?.actor?.user?.email);
  }, []);

  const resetUserConfig = async () => {
    await UserStorageMutation.mutate({
      actionType: UserStorageMutation.ACTION_TYPE.WRITE_DOCUMENT,
      collection: 'USER_CONFIG',
      documentId: 'config',
      document: {}
    });
    await getUserConfig();
  };

  if (hide || !email || !email.endsWith('@newrelic.com')) {
    return <></>;
  }

  return (
    <div style={{ backgroundColor: 'red', padding: '10px' }}>
      <Button onClick={() => resetUserConfig()}>Reset user config</Button>

      <Button onClick={() => setHide(true)}>Hide Bar</Button>
    </div>
  );
}

export default AdminBar;
