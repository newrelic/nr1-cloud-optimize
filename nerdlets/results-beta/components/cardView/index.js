import React, { useContext } from 'react';
import { Button, Icon } from 'nr1';
import { numberWithCommas } from '../../../shared/utils';
import AwsIcon from '../../../shared/images/awsIcon2.png';
// eslint-disable-next-line no-unused-vars
export default function CardView(props) {
  const { cost, entities, entityType, pricingUrl, provider } = props;

  const renderProviderIcon = () => {
    if (provider === 'AWS') {
      return <img width="40px" height="40px" src={AwsIcon} alt={provider} />;
    }
  };

  return (
    <div
      style={{
        paddingLeft: '15px',
        paddingRight: '15px',
        paddingBottom: '15px',
        display: 'inline-block'
      }}
    >
      <div
        style={{
          width: '350px',
          backgroundColor: '#FFFFFF',
          borderTop: '5px solid #252627',
          borderLeft: '1px solid #e3e3e3',
          borderRight: '1px solid #e3e3e3',
          borderBottom: '1px solid #e3e3e3',
          paddingBottom: '20px',
          boxShadow: '5px 5px 15px 5px #e3e3e3',
          WebkitBoxShadow: '5px 5px 15px 5px #e3e3e3'
        }}
      >
        <div
          style={{
            paddingLeft: '20px',
            paddingRight: '20px',
            paddingTop: '10px',
            paddingBottom: '25px'
          }}
        >
          <div style={{ float: 'left' }}>
            <div style={{ float: 'left' }}>{renderProviderIcon(provider)}</div>
            <span
              style={{
                fontSize: '20px',
                fontWeight: 'bold',
                paddingLeft: '5px'
              }}
            >
              {entityType}
            </span>
            <br />
            <span style={{ paddingLeft: '5px' }}>
              {entities?.length === 1
                ? '1 entity'
                : `${entities.length} entities`}
              &nbsp;{' '}
              {/* {pricingUrl && (
                <span style={{ cursor: 'pointer', color: '#0B6ACB' }}>
                  Pricing{' '}
                  <Icon
                    style={{ marginBottom: '7px' }}
                    type={Icon.TYPE.INTERFACE__OPERATIONS__EXTERNAL_LINK}
                  />
                </span>
              )} */}
            </span>
            <br />
          </div>
        </div>
        <br /> <br />
        <br />
        <div style={{ paddingLeft: '20px', paddingRight: '20px' }}>
          <div
            style={{
              paddingTop: '10px',
              paddingBottom: '20px',
              borderBottom: '1px solid #e3e3e3'
            }}
          >
            <div
              style={{
                float: 'left',
                fontWeight: 'bold',
                fontSize: '14px'
              }}
            >
              Known Cost
            </div>
            <div
              style={{
                float: 'right',
                fontSize: '14px'
              }}
            >
              ${numberWithCommas(cost?.known || 0, 8)}
            </div>
            <br />
          </div>
          <div
            style={{
              paddingTop: '20px',
              paddingBottom: '20px',
              borderBottom: '1px solid #e3e3e3'
            }}
          >
            <div
              style={{ float: 'left', fontWeight: 'bold', fontSize: '14px' }}
            >
              Estimated Cost
            </div>
            <div style={{ float: 'right', fontSize: '14px' }}>
              ${numberWithCommas(cost?.estimated || 0, 8)}
            </div>
            <br />
          </div>
          <div
            style={{
              paddingTop: '20px',
              paddingBottom: '40px',
              borderBottom: '1px solid #e3e3e3'
            }}
          >
            <div
              style={{ float: 'left', fontWeight: 'bold', fontSize: '14px' }}
            >
              Known + Estimated Cost
            </div>
            <div
              style={{ float: 'right', fontWeight: 'bold', fontSize: '14px' }}
            >
              ${numberWithCommas(cost?.known || 0 + cost?.estimated || 0, 8)}
            </div>
          </div>

          <>
            <div
              style={{
                paddingTop: '20px',
                paddingBottom: '40px'
              }}
            >
              <div
                style={{ float: 'left', fontWeight: 'bold', fontSize: '14px' }}
              >
                Potential Saving
              </div>
              <div
                style={{
                  float: 'right',
                  fontWeight: 'bold',
                  fontSize: '14px',
                  color: '#0B6ACB'
                }}
              >
                ${numberWithCommas(cost?.potentialSaving || 0, 8)}
              </div>
            </div>
          </>
          <div>
            <Button
              type={Button.TYPE.PRIMARY}
              sizeType={Button.SIZE_TYPE.SMALL}
              iconType={
                Button.ICON_TYPE.HARDWARE_AND_SOFTWARE__HARDWARE__SERVER
              }
            >
              Show all entities
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
