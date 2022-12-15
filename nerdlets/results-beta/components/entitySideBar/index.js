import React, { useContext } from 'react';
import {
  Button,
  Tooltip,
  Card,
  CardBody,
  CardHeader,
  Icon,
  AutoSizer
} from 'nr1';
import { numberWithCommas } from '../../../shared/utils';
import DataContext from '../../context/data';

// eslint-disable-next-line no-unused-vars
export default function EntitySideBar(props) {
  const dataContext = useContext(DataContext);
  const { entitySideBarOpen, updateDataState } = dataContext;
  const { name, additionalFields, lastHeaders, guid } = entitySideBarOpen;

  return (
    <AutoSizer>
      {({ width }) => (
        <div
          style={{
            position: 'fixed',
            height: '100%',
            width,
            backgroundColor: 'white'
          }}
        >
          <Card style={{ marginRight: '15px' }}>
            <CardHeader>
              {guid && (
                <Button
                  style={{ float: 'left' }}
                  onClick={() =>
                    window.open(
                      ` https://one.newrelic.com/redirect/entity/${guid}`,
                      '_blank'
                    )
                  }
                  type={Button.TYPE.SECONDARY}
                  iconType={Button.ICON_TYPE.INTERFACE__ARROW__EXPAND}
                  sizeType={Button.SIZE_TYPE.SMALL}
                >
                  View entity details
                </Button>
              )}
              <Button
                style={{ float: 'right' }}
                type={Button.TYPE.PLAIN}
                iconType={Button.ICON_TYPE.INTERFACE__OPERATIONS__CLOSE}
                onClick={() => updateDataState({ entitySideBarOpen: null })}
              />
            </CardHeader>
            <CardBody>
              <div>
                <div style={{ float: 'left' }}>
                  <h4 style={{ paddingBottom: '10px', paddingRight: '25px' }}>
                    {name}
                  </h4>
                </div>
                <br />
                <table>
                  {Object.keys(additionalFields).map(field => {
                    const { key, value } = additionalFields[field];
                    return (
                      <tr key={field.key}>
                        <td style={{ fontWeight: 'bold' }}>{key}</td>
                        <td style={{ textAlign: 'right' }}>
                          {value({ item: entitySideBarOpen })}
                        </td>
                      </tr>
                    );
                  })}
                  {Object.keys(lastHeaders).map(field => {
                    const { key, value } = lastHeaders[field];
                    const fieldValue = value({ item: entitySideBarOpen });
                    const strValue = isNaN(fieldValue)
                      ? fieldValue
                      : `$${numberWithCommas(fieldValue)}`;

                    const keySplit = key.split('(');
                    const keyValue = keySplit[0];

                    const additionalInfo = keySplit[1]
                      ? keySplit[1].replaceAll(')', '')
                      : null;

                    return (
                      <tr key={field.key}>
                        <td style={{ fontWeight: 'bold' }}>
                          {keyValue}{' '}
                          {additionalInfo && (
                            <Tooltip text={additionalInfo}>
                              <Icon
                                type={Icon.TYPE.INTERFACE__INFO__INFO}
                                placementType={Tooltip.PLACEMENT_TYPE.TOP}
                              />
                            </Tooltip>
                          )}
                        </td>
                        <td style={{ textAlign: 'right' }}>{strValue}</td>
                      </tr>
                    );
                  })}
                </table>
              </div>
            </CardBody>
          </Card>
        </div>
      )}
    </AutoSizer>
  );
}
