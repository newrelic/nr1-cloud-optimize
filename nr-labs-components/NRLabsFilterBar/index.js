import React, { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';

import { Spinner } from 'nr1';

import FilterByIcon from './filter.svg';
import SearchIcon from './search.svg';
import CloseIcon from './close.svg';
import OpenIcon from './open.svg';
import Label from './label';
import Conjunction from './conjunction';
import Value from './value';

const NRLabsFilterBar = ({ options, onChange, getValues }) => {
  const thisComponent = useRef();
  const inputField = useRef();
  const [showItemsList, setShowItemsList] = useState(false);
  const [filterItems, setFilterItems] = useState([]);
  const [filterString, setFilterString] = useState('');
  const [searchTexts, setSearchTexts] = useState([]);
  const [displayOptions, setDisplayOptions] = useState([]);
  const [optionShouldMatch, setOptionShouldMatch] = useState([]);
  const [optionFilterMatch, setOptionFilterMatch] = useState([]);
  const [optionsLoading, setOptionsLoading] = useState([]);
  const [optionsSearchText, setOptionsSearchText] = useState('');
  const [values, setValues] = useState([]);
  const [shownValues, setShownValues] = useState([]);
  const [conjunctions, setConjunctions] = useState([]);
  const lastGroup = useRef('');
  const searchTimeout = useRef();

  const MIN_ITEMS_SHOWN = 5;
  const MAX_DROPDOWN_WIDTH = 360;

  useEffect(() => {
    function handleClicksOutsideComponent(evt) {
      if (
        showItemsList &&
        thisComponent &&
        !thisComponent?.current?.contains(evt?.target)
      )
        setShowItemsList(false);
    }
    document.addEventListener('mousedown', handleClicksOutsideComponent);

    return function cleanup() {
      document.removeEventListener('mousedown', handleClicksOutsideComponent);
    };
  });

  useEffect(() => {
    setDisplayOptions(options.map((_, i) => !i));
    setOptionShouldMatch(options.map(() => true));
    setOptionFilterMatch(options.map(() => true));
    setOptionsLoading(options.map(() => false));
    setValues(
      options.map(o =>
        (o.values || []).map(v => ({
          value: v,
          display: String(v),
          id: String(v).replaceAll('^[^a-zA-Z_$]|[^\\w$]', '_'),
          type: o.type,
          attribute: o.option,
          isIncluded: true,
          isSelected: false,
          shouldMatch: true
        }))
      )
    );
    setShownValues(
      options.map(o => (o.values.length > 6 ? 5 : o.values.length))
    );
  }, [options]);

  useEffect(() => {
    const fltrStr = updateFilterString();
    if (fltrStr !== filterString) {
      setFilterString(fltrStr);
      if (onChange) onChange(fltrStr);
    }
  }, [filterItems, conjunctions, optionShouldMatch]);

  const itemsListWidth =
    inputField && inputField.current
      ? inputField.current.clientWidth - 14
      : MAX_DROPDOWN_WIDTH;
  const dropdownWidth = Math.min(itemsListWidth, MAX_DROPDOWN_WIDTH);
  const checkboxWidth = (dropdownWidth - 32) / 2;

  const checkHandler = (optionIdx, valueIdx) => {
    const vals = [...values];
    vals[optionIdx][valueIdx].isSelected = !vals[optionIdx][valueIdx]
      .isSelected;
    setValues(vals);
    const fltrItems = vals
      .reduce(
        (qry, opt, i) => {
          opt.reduce((qry, val, j) => {
            if (!val.isSelected) return qry;
            const idx = +!val.shouldMatch;
            if (!(val.attribute in qry[idx]))
              qry[idx][val.attribute] = {
                attribute: val.attribute,
                optionIndex: i,
                type: val.type,
                matchType: val.shouldMatch,
                valueIndexes: []
              };
            qry[idx][val.attribute].valueIndexes.push(j);
            return qry;
          }, qry);
          return qry;
        },
        [{}, {}]
      )
      .reduce(
        (fi, matches) =>
          Object.keys(matches).reduce((fi, opt) => [...fi, matches[opt]], fi),
        []
      );

    if (conjunctions.length < fltrItems.length)
      setConjunctions([...conjunctions, 'AND']);
    setFilterItems(fltrItems);
  };

  const updateOptionsSearchText = evt => {
    const searchText = evt.target.value;
    setOptionsSearchText(searchText);
    const searchRE = new RegExp(searchText, 'i');
    setOptionFilterMatch(options.map(o => searchRE.test(o.option)));
    setShowItemsList(true);
  };

  const updateSearchText = (evt, option, idx) => {
    const searchText = evt.target.value;
    setSearchTexts(searchTexts.map((st, i) => (i === idx ? searchText : st)));
    const searchRE = new RegExp(searchText, 'i');

    clearTimeout(searchTimeout.current);
    if (searchText.trim()) {
      searchTimeout.current = setTimeout(async () => {
        setOptionsLoading(optionsLoading.map((l, i) => (i === idx ? true : l)));
        const updatedValues = await loadValuesLive(
          option.option,
          option.type,
          idx,
          searchText,
          searchRE
        );
        setValues(
          options.map((_, i) => (i === idx ? updatedValues : values[i]))
        );
        setShownValues(
          shownValues.map((s, i) =>
            i === idx // eslint-disable-line no-nested-ternary
              ? updatedValues.length > 6
                ? 5
                : updatedValues.length
              : s
          )
        );
        setOptionsLoading(
          optionsLoading.map((l, i) => (i === idx ? false : l))
        );
      }, 500);
    } else {
      setValues(
        values.map((val, i) =>
          i === idx ? val.map(v => ({ ...v, isIncluded: true })) : val
        )
      );
      setShownValues(
        shownValues.map((show, i) =>
          i === idx ? shownCount(values[idx].length, show) : show
        )
      );
    }
  };

  const includedValuesCount = arr => arr.filter(val => val.isIncluded).length;

  const shownCount = (count, show = MIN_ITEMS_SHOWN) =>
    count > Math.max(show, MIN_ITEMS_SHOWN)
      ? Math.max(show, MIN_ITEMS_SHOWN)
      : count;

  const optionClickHandler = async (option, idx) => {
    const shouldLoad = !values[idx].length;
    setDisplayOptions(displayOptions.map((d, i) => (i === idx ? !d : d)));
    setOptionsLoading(
      optionsLoading.map((l, i) => (i === idx && shouldLoad ? true : l))
    );
    if (shouldLoad) loadValues(option, idx);
  };

  const updateShownValues = (evt, idx) => {
    evt.preventDefault();
    const shown = [...shownValues];
    shown[idx] = values[idx].filter(val => val.isIncluded).length;
    setShownValues(shown);
  };

  const shownAndIncluded = (vals, idx) =>
    [...vals].reduce(
      (acc, cur) =>
        cur.isIncluded && acc.length < shownValues[idx] ? [...acc, cur] : acc,
      []
    );

  const loadValues = async (option, idx) => {
    const vals = await getValues(option.option);
    setValues(
      options.map((o, i) =>
        i === idx
          ? (vals || []).map(v => ({
              value: v,
              display: String(v),
              id: String(v).replaceAll('^[^a-zA-Z_$]|[^\\w$]', '_'),
              type: o.type,
              attribute: o.option,
              isIncluded: true,
              isSelected: false,
              shouldMatch: true
            }))
          : values[i]
      )
    );
    setShownValues(
      shownValues.map(
        (s, i) => (i === idx ? (vals.length > 6 ? 5 : vals.length) : s) // eslint-disable-line no-nested-ternary
      )
    );
    setOptionsLoading(optionsLoading.map((l, i) => (i === idx ? false : l)));
  };

  const loadValuesLive = async (attr, type, idx, searchStr, searchRE) => {
    let cond = ` WHERE `;
    if (type === 'string') {
      cond += ` ${attr} LIKE '%${searchStr}%' `;
    } else {
      const matches = [...searchStr.matchAll(/([><]+)\s{0,}([.-\d]{1,})/g)];
      if (matches.length) {
        cond += matches
          .map(([, op, num]) =>
            op && !isNaN(num) ? ` ${attr} ${op} ${Number(num)} ` : ''
          )
          .join(' AND ');
      } else {
        const sanitizedSearchStr = searchStr.replace(/[^\w\s]/gi, '');
        cond += ` ${attr} = ${sanitizedSearchStr || 'false'} `;
      }
    }
    const vals = await getValues(attr, cond);
    const prevValues = values[idx].map(v => ({
      ...v,
      isIncluded: searchRE.test(v.display) || vals.includes(v.value)
    }));
    return vals.reduce((acc, val) => {
      if (!acc.some(v => v.value === val))
        acc.push({
          value: val,
          display: String(val),
          id: String(val).replaceAll('^[^a-zA-Z_$]|[^\\w$]', '_'),
          type: type,
          attribute: attr,
          isIncluded: true,
          isSelected: false,
          shouldMatch: true
        });
      return acc;
    }, prevValues);
  };

  const selectedValuesCounter = idx => {
    const count = selectedValuesCount(idx);
    if (count)
      return (
        <span className="nrlabs-filter-bar-list-option-count">{count}</span>
      );
  };

  const selectedValuesCount = idx =>
    values[idx].reduce((acc, val) => (val.isSelected ? (acc += 1) : acc), 0);

  const filterItemStr = item => {
    const attribValues = item.valueIndexes.map(
      valIdx => values[item.optionIndex][valIdx].value
    );
    const hasMany = attribValues.length > 1;
    const surround = item.type === 'string' ? `'` : '';
    const joinStr = `${surround}, ${surround}`;
    const operator = optionShouldMatch[item.optionIndex] // eslint-disable-line no-nested-ternary
      ? hasMany
        ? 'IN'
        : '='
      : hasMany
      ? 'NOT IN'
      : '!=';
    const valuesStr = `${hasMany ? '(' : ''}${surround}${attribValues.join(
      joinStr
    )}${surround}${hasMany ? ')' : ''}`;
    return `${item.attribute} ${operator} ${valuesStr}`;
  };

  const removeFilterItem = idx => {
    const fltrItems = [...filterItems];
    const cnjctns = [...conjunctions];
    const optIdx = fltrItems[idx].optionIndex;
    const vals = values.map((opt, i) =>
      i === optIdx
        ? opt.map(val => ({ ...val, isSelected: false, shouldMatch: true }))
        : opt
    );
    fltrItems.splice(idx, 1);
    cnjctns.splice(idx, 1);
    setConjunctions(cnjctns);
    setFilterItems(fltrItems);
    setValues(vals);
  };

  const updateFilterString = () =>
    filterItems.length
      ? filterItems
          .map(
            (item, i) =>
              `${filterItemStr(item)} ${
                i < filterItems.length - 1 ? conjunctions[i] : ''
              }`
          )
          .join(' ')
      : '';

  const changeConjunction = (idx, operator) =>
    setConjunctions(
      conjunctions.map((conj, i) => (i === idx ? operator : conj))
    );

  const changeMatchType = (idx, shouldMatch, evt) => {
    evt.stopPropagation();
    setOptionShouldMatch(
      optionShouldMatch.map((type, i) => (i === idx ? shouldMatch : type))
    );
  };

  const groupBar = group => {
    lastGroup.current = group;
    return <div className="nrlabs-filter-bar-list-group">{group}</div>;
  };

  return (
    <div className="nrlabs-filter-bar" ref={thisComponent}>
      <div className="nrlabs-filter-bar-input-field" ref={inputField}>
        <div className="nrlabs-filter-bar-input-field-icon">
          <img src={FilterByIcon} alt="filter by" />
        </div>
        <div
          className={`nrlabs-filter-bar-input-field-input ${
            !filterItems.length ? 'placeholder' : ''
          }`}
          onClick={() => setShowItemsList(!showItemsList)}
        >
          {filterItems.map((item, i) => (
            <React.Fragment key={i}>
              <Label
                value={filterItemStr(item)}
                onRemove={() => removeFilterItem(i)}
              />
              <Conjunction
                operator={conjunctions[i]}
                isHint={i === filterItems.length - 1}
                onChange={operator => changeConjunction(i, operator)}
              />
            </React.Fragment>
          ))}
          <span className="nrlabs-filter-bar-input-field-search">
            <input
              type="text"
              className="u-unstyledInput"
              placeholder={!filterItems.length ? 'Filter by...' : ''}
              value={optionsSearchText}
              onChange={updateOptionsSearchText}
            />
          </span>
        </div>
      </div>
      {showItemsList ? (
        <div
          className="nrlabs-filter-bar-list"
          style={{ width: dropdownWidth }}
        >
          {options.map((option, i) =>
            optionFilterMatch[i] ? (
              <>
                {option.group && option.group !== lastGroup.current
                  ? groupBar(option.group)
                  : null}
                <div className="nrlabs-filter-bar-list-options">
                  <div
                    className="nrlabs-filter-bar-list-option"
                    onClick={() => optionClickHandler(option, i)}
                  >
                    <img
                      src={displayOptions[i] ? OpenIcon : CloseIcon}
                      alt="show or hide options"
                    />
                    <span>{option.option}</span>
                    {optionsLoading[i] ? (
                      <Spinner inline />
                    ) : (
                      selectedValuesCounter(i)
                    )}
                    {displayOptions[i] ? (
                      <span
                        className={`nrlabs-filter-bar-list-option-picker ${
                          !selectedValuesCount(i) ? 'lighten' : ''
                        }`}
                      >
                        <span
                          className={`equal ${
                            optionShouldMatch[i] ? 'selected' : ''
                          }`}
                          onClick={evt => changeMatchType(i, true, evt)}
                        />
                        <span
                          className={`not-equal ${
                            !optionShouldMatch[i] ? 'selected' : ''
                          }`}
                          onClick={evt => changeMatchType(i, false, evt)}
                        />
                      </span>
                    ) : null}
                  </div>
                  {displayOptions[i] ? (
                    <>
                      <div className="nrlabs-filter-bar-list-option-search">
                        <img src={SearchIcon} alt="search options" />
                        <input
                          type="text"
                          style={{ backgroundColor: '#FFF' }}
                          value={searchTexts[i]}
                          onChange={evt => updateSearchText(evt, option, i)}
                        />
                      </div>
                      <div className="nrlabs-filter-bar-list-option-values">
                        {shownAndIncluded(values[i], i).map((value, j) => (
                          <Value
                            value={value}
                            width={checkboxWidth}
                            optionIndex={i}
                            valueIndex={j}
                            onChange={checkHandler}
                            key={j}
                          />
                        ))}
                        {includedValuesCount(values[i]) > shownValues[i] ? (
                          <div
                            className="nrlabs-filter-bar-list-option-value"
                            style={{ width: checkboxWidth }}
                          >
                            <a
                              onClick={evt => updateShownValues(evt, i)}
                            >{`Show ${includedValuesCount(values[i]) -
                              shownValues[i]} more...`}</a>
                          </div>
                        ) : null}
                      </div>
                    </>
                  ) : null}
                </div>
              </>
            ) : null
          )}
        </div>
      ) : null}
    </div>
  );
};

NRLabsFilterBar.propTypes = {
  options: PropTypes.arrayOf(
    PropTypes.shape({
      option: PropTypes.string,
      info: PropTypes.string,
      values: PropTypes.array,
      group: PropTypes.string
    })
  ),
  onChange: PropTypes.func,
  getValues: PropTypes.func
};

export default NRLabsFilterBar;
