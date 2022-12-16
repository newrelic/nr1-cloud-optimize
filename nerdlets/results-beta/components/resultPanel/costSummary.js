import React from 'react';
import {
  Tile,
  Stack,
  StackItem,
  HeadingText,
  BlockText,
  Popover,
  PopoverTrigger,
  Icon,
  PopoverBody
} from 'nr1';

// eslint-disable-next-line no-unused-vars
export default function CostSummary(props) {
  const { cost, tileType } = props;

  if (!cost) {
    return '';
  }

  return (
    <>
      <div>
        {/* <div style={{ display: 'flex', justifyContent: 'center' }}> */}
        <Stack style={{ paddingBottom: '10px' }}>
          <StackItem>
            <Tile type={Tile.TYPE[tileType || 'SOLID']} disabled={!cost?.known}>
              <HeadingText type={HeadingText.TYPE.HEADING_6}>
                Known Cost&nbsp;{' '}
                <Popover openOnHover>
                  <PopoverTrigger>
                    <Icon type={Icon.TYPE.INTERFACE__INFO__INFO} />
                  </PopoverTrigger>
                  <PopoverBody>
                    <BlockText>
                      &nbsp;Exactly matched price based on public price
                      lists&nbsp;
                    </BlockText>
                  </PopoverBody>
                </Popover>
              </HeadingText>
              <BlockText>${(cost?.known || 0).toFixed(2)}</BlockText>
            </Tile>
          </StackItem>
          <StackItem>
            <Tile
              type={Tile.TYPE[tileType || 'SOLID']}
              disabled={!cost?.estimated}
            >
              <HeadingText type={HeadingText.TYPE.HEADING_6}>
                Estimated Cost&nbsp;{' '}
                <Popover openOnHover>
                  <PopoverTrigger>
                    <Icon type={Icon.TYPE.INTERFACE__INFO__INFO} />
                  </PopoverTrigger>
                  <PopoverBody>
                    <BlockText>
                      &nbsp;Best effort estimation based on public pricing&nbsp;
                    </BlockText>
                  </PopoverBody>
                </Popover>
              </HeadingText>
              <BlockText>${(cost?.estimated || 0).toFixed(2)}</BlockText>
            </Tile>
          </StackItem>
          <StackItem>
            <Tile
              type={Tile.TYPE[tileType || 'SOLID']}
              disabled={!cost?.estimated && !cost?.known}
            >
              <HeadingText type={HeadingText.TYPE.HEADING_6}>
                Known + Estimated Cost&nbsp;{' '}
                <Popover openOnHover>
                  <PopoverTrigger>
                    <Icon type={Icon.TYPE.INTERFACE__INFO__INFO} />
                  </PopoverTrigger>
                  <PopoverBody>
                    <BlockText>
                      &nbsp;Total determined running cost based on known and
                      estimated cost&nbsp;
                    </BlockText>
                  </PopoverBody>
                </Popover>
              </HeadingText>
              <BlockText>
                ${((cost?.known || 0) + (cost?.estimated || 0)).toFixed(2)}
              </BlockText>
            </Tile>
          </StackItem>
          {/* <StackItem>
            <Tile type={Tile.TYPE[tileType || 'SOLID']}>
              <HeadingText type={HeadingText.TYPE.HEADING_6}>
                Optimized Run Cost{' '}
                <Popover openOnHover>
                  <PopoverTrigger>
                    <Icon type={Icon.TYPE.INTERFACE__INFO__INFO} />
                  </PopoverTrigger>
                  <PopoverBody>
                    <BlockText>
                      &nbsp;If optimization was to occur, this would be the new
                      cost&nbsp;
                    </BlockText>
                  </PopoverBody>
                </Popover>
              </HeadingText>
              <BlockText>${cost.optimizedRun}</BlockText>
            </Tile>
          </StackItem> */}
          <StackItem>
            <Tile
              type={Tile.TYPE[tileType || 'SOLID']}
              disabled={!cost?.potentialSaving}
              style={{
                border: cost?.potentialSaving ? '1px solid #0B6ACB' : undefined,
                backgroundColor: cost?.potentialSaving ? '#F6FAFD' : undefined
              }}
            >
              <HeadingText type={HeadingText.TYPE.HEADING_6}>
                Potential Saving{' '}
                <Popover openOnHover>
                  <PopoverTrigger>
                    <Icon type={Icon.TYPE.INTERFACE__INFO__INFO} />
                  </PopoverTrigger>
                  <PopoverBody>
                    <BlockText>
                      &nbsp;If optimization was to occur, this would be the
                      potential savings&nbsp;
                    </BlockText>
                  </PopoverBody>
                </Popover>
              </HeadingText>
              <BlockText>${(cost?.potentialSaving || 0).toFixed(2)}</BlockText>
            </Tile>
          </StackItem>
        </Stack>
      </div>
    </>
  );
}
