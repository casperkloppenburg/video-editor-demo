import React from 'react';
import { observer } from 'mobx-react-lite';
import { ElementState } from '../../renderer/ElementState';
import { videoCreator } from '../../stores/VideoCreatorStore';
import { Select } from '../Select';

interface PropertySelectProps {
  activeElement: ElementState;
  propertyName: string;
  defaultValue: any;
  options: Array<{ caption: string; value: any }>;
}

export const PropertySelect: React.FC<PropertySelectProps> = observer((props) => {
  return (
    <Select
      value={props.activeElement.source[props.propertyName] ?? props.defaultValue}
      onChange={async (e) => {
        await videoCreator.renderer?.applyModifications({
          [`${props.activeElement.source.id}.${props.propertyName}`]: e.target.value,
        });
      }}
    >
      {props.options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.caption}
        </option>
      ))}
    </Select>
  );
});
