import React, { useContext } from 'react';
import { Button, HeadingText, Tile, Icon } from 'nr1';
import DataContext from '../../context/data';

// eslint-disable-next-line no-unused-vars
export default function Help(props) {
  const dataContext = useContext(DataContext);
  const { updateDataState } = dataContext;

  return (
    <>
      <Tile
        onClick={() =>
          window.open(
            'https://github.com/newrelic/nr1-cloud-optimize/issues/new?assignees=&labels=bug%2C+needs-triage&template=bug_report.md&title=',
            '_blank'
          )
        }
      >
        <div style={{ display: 'inline-block' }}>
          <HeadingText type={HeadingText.TYPE.HEADING_5}>
            <Icon type={Icon.TYPE.INTERFACE__SIGN__EXCLAMATION} />
            &nbsp; Report a Bug
          </HeadingText>
        </div>
      </Tile>
      <br />
      <Tile
        onClick={() =>
          window.open(
            'https://github.com/newrelic/nr1-cloud-optimize/issues/new?assignees=&labels=enhancement%2C+needs-triage&template=enhancement.md&title=',
            '_blank'
          )
        }
      >
        <div style={{ display: 'inline-block' }}>
          <HeadingText type={HeadingText.TYPE.HEADING_5}>
            <Icon type={Icon.TYPE.PROFILES__EVENTS__FAVORITE__WEIGHT_BOLD} />
            &nbsp; Submit a Feature Request
          </HeadingText>
        </div>
      </Tile>
      <br />
      <Tile
        onClick={() =>
          window.open(
            'https://github.com/newrelic/nr1-cloud-optimize/discussions',
            '_blank'
          )
        }
      >
        <div style={{ display: 'inline-block' }}>
          <HeadingText type={HeadingText.TYPE.HEADING_5}>
            <Icon type={Icon.TYPE.PROFILES__USERS__ORGANIZATION} />
            &nbsp; Ask a Question
          </HeadingText>
        </div>
      </Tile>
      <br />
      <Tile
        onClick={() =>
          window.open(
            'https://github.com/newrelic/nr1-cloud-optimize#readme',
            '_blank'
          )
        }
      >
        <div style={{ display: 'inline-block' }}>
          <HeadingText type={HeadingText.TYPE.HEADING_5}>
            <Icon type={Icon.TYPE.DOCUMENTS__DOCUMENTS__NOTES} />
            &nbsp; Open the Documentation
          </HeadingText>
        </div>
      </Tile>
      <br />
      &nbsp;
      <Button
        style={{ float: 'right' }}
        onClick={() => updateDataState({ helpModalOpen: false })}
      >
        Close
      </Button>
    </>
  );
}
