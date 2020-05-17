import React from 'react';
import { Icon } from 'semantic-ui-react';

export const toastMsg = (msg, icon, loading) => (
  <>
    <Icon name={icon} loading={loading || false} />
    &nbsp;
    {msg}
  </>
);
