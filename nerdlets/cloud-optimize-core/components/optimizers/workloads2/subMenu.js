import React from 'react';
import { WorkloadsConsumer } from './context';
import { Button, AccountPicker, navigation } from 'nr1';

export default class SubMenu extends React.PureComponent {
  render() {
    const { accountId, setAccount } = this.props;
    return (
      <WorkloadsConsumer>
        {({ selectedWorkload, updateDataState }) => {
          return (
            <>
              {accountId && (
                <AccountPicker
                  value={accountId}
                  onChange={(e, accountId) => setAccount(accountId)}
                />
              )}
              &nbsp;
              {selectedWorkload && (
                <>
                  <Button
                    onClick={() =>
                      navigation.openStackedEntity(selectedWorkload.guid)
                    }
                    type={Button.TYPE.PRIMARY}
                    sizeType={Button.SIZE_TYPE.SMALL}
                    iconType={
                      Button.ICON_TYPE.INTERFACE__VIEW__HIGH_DENSITY_VIEW
                    }
                  >
                    {selectedWorkload.name}
                  </Button>
                  &nbsp;
                  <Button
                    onClick={() => updateDataState({ selectedWorkload: null })}
                    type={Button.TYPE.PRIMARY}
                    sizeType={Button.SIZE_TYPE.SMALL}
                    iconType={Button.ICON_TYPE.INTERFACE__ARROW__RETURN_LEFT}
                  >
                    Back
                  </Button>
                </>
              )}
            </>
          );
        }}
      </WorkloadsConsumer>
    );
  }
}
