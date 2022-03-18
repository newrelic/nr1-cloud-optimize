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
            <Tile type={Tile.TYPE[tileType || 'SOLID']}>
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
              <BlockText>${cost.known}</BlockText>
            </Tile>
          </StackItem>
          <StackItem>
            <Tile type={Tile.TYPE[tileType || 'SOLID']}>
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
              <BlockText>${cost.estimated}</BlockText>
            </Tile>
          </StackItem>
          <StackItem>
            <Tile type={Tile.TYPE[tileType || 'SOLID']}>
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
              <BlockText>${cost.known + cost.estimated}</BlockText>
            </Tile>
          </StackItem>
          <StackItem>
            <Tile type={Tile.TYPE[tileType || 'SOLID']}>
              <HeadingText type={HeadingText.TYPE.HEADING_6}>
                Optimized Cost{' '}
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
              <BlockText>${cost.optimized}</BlockText>
            </Tile>
          </StackItem>
          <StackItem>
            <Tile type={Tile.TYPE[tileType || 'SOLID']}>
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
              <BlockText>${cost.potentialSaving}</BlockText>
            </Tile>
          </StackItem>
        </Stack>
      </div>
    </>
  );
}
