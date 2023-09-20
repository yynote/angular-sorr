import {Injectable} from '@angular/core';
import {Actions, Effect, ofType} from '@ngrx/effects';
import {Store} from '@ngrx/store';
import {forkJoin, of} from 'rxjs';
import {catchError, mergeMap, switchMap, withLatestFrom} from 'rxjs/operators';
import {Boxed, SetValueAction} from 'ngrx-forms';

import * as shopsStepActions from '../../actions/bulk-equipment-wizard-actions/shops-step.actions';

import * as fromEquipment from '../../reducers';

import * as shopsStepStore from '../../reducers/bulk-equipment-wizard-reducers/shops-step.store';

import * as shopsStepSelectors from '../../reducers/bulk-equipment-wizard-reducers/selectors/shops-step.selectors';
import * as commonData from '../../../../../shared/store/selectors/common-data.selectors';

import {MeterService} from '../../../meter.service';

import {updateDropdownData} from '../../utilities/bulk-wizard';
import {BulkDropdownType} from '../../../models';
import {ShopsStepActionType} from '@app/branch/buildings/manage-building/building-equipment/shared/models/bulk-action.model';


@Injectable()
export class ShopsStepEffects {

  // Get shops and common areas
  @Effect() getShopsAndCommonAreas = this.actions$.pipe(
    ofType(shopsStepActions.INIT_SHOPS_AND_COMMON_AREAS),
    withLatestFrom(
      this.store$.select(commonData.getBuildingId),
      this.store$.select(commonData.getSelectedVersionId),
      (_, buildingId, versionId) => {
        return {
          buildingId: buildingId,
          versionId: versionId
        };
      }),
    switchMap(({buildingId, versionId}) => {
      const shops = this.meterService.getShops(buildingId, versionId);
      const commonAreas = this.meterService.getCommonAreas(buildingId, versionId);

      const join = forkJoin(shops, commonAreas);
      return join.pipe(
        mergeMap(([shops, commonAreas]) => {
          return [
            new shopsStepActions.SetShops(shops),
            new shopsStepActions.SetCommonAreas(commonAreas)
          ];
        }),
        catchError(r => {
          return of({type: 'DUMMY'});
        })
      );
    })
  );
  // Supply to change
  @Effect() supplyToChange = this.actions$.pipe(
    ofType(shopsStepActions.SUPPLY_TO_CHANGED),
    withLatestFrom(this.store$.select(shopsStepSelectors.getMeterDropdownData),
      this.store$.select(shopsStepSelectors.getFormState),
      (action: any, filteredDropdownData, form) => {
        return {
          locationId: action.payload.locationId,
          id: action.payload.id,
          groupId: action.payload.groupId,
          supplyToId: action.payload.supplyToId,
          filteredDropdownData: filteredDropdownData,
          form: form
        };
      }),
    switchMap(({locationId, id, groupId, supplyToId, filteredDropdownData, form}) => {
      const dropdownData = {...filteredDropdownData};

      let tempObj = dropdownData[id];

      const suppliesTo = [...tempObj[BulkDropdownType.Supplies]];

      tempObj = updateDropdownData(tempObj, [BulkDropdownType.Supplies, BulkDropdownType.SelectedSupplyTo], suppliesTo, supplyToId);

      const supplyTypes = suppliesTo.find(s => s.id === supplyToId).supplyTypes;

      const supplyToLocations = supplyTypes.length ? supplyTypes[0].supplyToLocations : [];

      tempObj = updateDropdownData(tempObj, [BulkDropdownType.LocationTypes, BulkDropdownType.SelectedLocationType], supplyToLocations, null, 'name');

      const locIndex = form.value.locationGroupMeters.findIndex(gm => gm.groupId === groupId);
      const locationGroupMeters = [...form.value.locationGroupMeters];
      const meters = [...form.value.locationGroupMeters[locIndex].meters];
      const index = meters.findIndex(t => t.id === id);
      const formValue = {...form.value, locationGroupMeters: locationGroupMeters};

      meters.splice(index, 1, {
        ...meters[index],
        supplyToId: tempObj[BulkDropdownType.SelectedSupplyTo].id,
        locationType: tempObj[BulkDropdownType.SelectedLocationType] ? tempObj[BulkDropdownType.SelectedLocationType].name : null
      });

      locationGroupMeters.splice(locIndex, 1, {...locationGroupMeters[locIndex], meters: meters});

      dropdownData[id] = tempObj;

      return [
        new SetValueAction(shopsStepStore.FORM_ID, formValue),
        new shopsStepActions.SetDropdownData(dropdownData)
      ];
    })
  );
  // Location type change
  @Effect() locationTypeChange = this.actions$.pipe(
    ofType(shopsStepActions.LOCATION_TYPE_CHANGED),
    withLatestFrom(this.store$.select(shopsStepSelectors.getMeterDropdownData),
      this.store$.select(shopsStepSelectors.getFormState),
      (action: any, filteredDropdownData, form) => {
        return {
          locationId: action.payload.locationId,
          id: action.payload.id,
          groupId: action.payload.groupId,
          locationType: action.payload.locationType,
          filteredDropdownData: filteredDropdownData,
          form: form
        };
      }),
    switchMap(({locationId, id, groupId, locationType, filteredDropdownData, form}) => {
      const dropdownData = {...filteredDropdownData};

      let tempObj = dropdownData[id];

      const supplyToLocations = [...tempObj[BulkDropdownType.LocationTypes]];

      tempObj = updateDropdownData(tempObj, [BulkDropdownType.LocationTypes, BulkDropdownType.SelectedLocationType], supplyToLocations, locationType, 'name');

      const locIndex = form.value.locationGroupMeters.findIndex(gm => gm.groupId === groupId);
      const locationGroupMeters = [...form.value.locationGroupMeters];
      const meters = [...form.value.locationGroupMeters[locIndex].meters];
      const index = meters.findIndex(t => t.id === id);
      meters.splice(index, 1, {...meters[index], locationType: tempObj[BulkDropdownType.SelectedLocationType].name});

      locationGroupMeters.splice(locIndex, 1, {...locationGroupMeters[locIndex], meters: meters});
      const formValue = {...form.value, locationGroupMeters: locationGroupMeters};

      dropdownData[id] = tempObj;

      return [
        new SetValueAction(shopsStepStore.FORM_ID, formValue),
        new shopsStepActions.SetDropdownData(dropdownData)
      ];
    })
  );
  // Apply bulk value
  @Effect() applyBulkValue = this.actions$.pipe(
    ofType(shopsStepActions.APPLY_BULK_VALUE),
    withLatestFrom(this.store$.select(shopsStepSelectors.getMeterDropdownData),
      this.store$.select(shopsStepSelectors.getFormState),
      (action: any, filteredDropdownData, form) => {
        return {
          bulkAction: action.payload.bulkAction,
          bulkValue: action.payload.bulkValue,
          filteredDropdownData: filteredDropdownData,
          form: form
        };
      }),
    switchMap(({bulkAction, bulkValue, filteredDropdownData, form}) => {
      const dropdownData = {...filteredDropdownData};
      switch (bulkAction) {
        case ShopsStepActionType.SelectSupplyToAndLocationType: {
          const formValue = {
            locationGroupMeters: form.value.locationGroupMeters.map(gm => {
              return {
                ...gm,
                meters: gm.meters.map(m => {
                  if (m.isSelected) {

                    return {
                      ...m,
                      supplyToId: bulkValue[m.equipmentGroupId] ? bulkValue[m.equipmentGroupId].supplyToId : m.supplyToId,
                      locationType: bulkValue[m.equipmentGroupId] ? bulkValue[m.equipmentGroupId].locationName : m.locationType
                    };
                  } else {
                    return m;
                  }
                })
              };
            })
          };
          return [
            new SetValueAction(shopsStepStore.FORM_ID, formValue),
            new shopsStepActions.SetDropdownData(dropdownData)
          ];
        }

        case ShopsStepActionType.SetDescription: {
          const formValue = {
            locationGroupMeters: form.value.locationGroupMeters.map(gm => {
              return {
                ...gm,
                meters: gm.meters.map(m => {
                  if (m.isSelected) {
                    return {
                      ...m,
                      description: bulkValue
                    };
                  } else {
                    return m;
                  }
                })
              };
            })
          };
          return [new SetValueAction(shopsStepStore.FORM_ID, formValue)];
        }
        case ShopsStepActionType.SetUnits: {
          const formValue = {
            locationGroupMeters: form.value.locationGroupMeters.map(gm => {
              return {
                ...gm,
                meters: gm.meters.map(m => {
                  if (m.isSelected) {
                    const unitIds: Boxed<string[]> = {
                      __boxed: '',
                      value: []
                    };

                    unitIds.value = bulkValue;
                    return {
                      ...m,
                      unitIds: unitIds
                    };
                  } else {
                    return m;
                  }
                })
              };
            })
          };
          return [new SetValueAction(shopsStepStore.FORM_ID, formValue)];
        }
        case ShopsStepActionType.SetParentMeter: {
          let locationGroupMeters = [];
          Object.keys(bulkValue).forEach(key => {
            const parentMeters = bulkValue[key]['parentMeters'];
            locationGroupMeters = form.value.locationGroupMeters.map(gm => {
              return {
                ...gm,
                meters: gm.meters.map(m => {
                  if (m.isSelected) {
                    const parentMetersBox: Boxed<string[]> = {
                      __boxed: '',
                      value: []
                    };

                    parentMetersBox.value = parentMeters;

                    return {
                      ...m,
                      parentMeters: parentMetersBox
                    };
                  } else {
                    return m;
                  }
                })
              };
            });
          });

          const formValue = {
            locationGroupMeters
          };

          return [new SetValueAction(shopsStepStore.FORM_ID, formValue)];
        }
      }
    })
  );

  constructor(
    private actions$: Actions,
    private store$: Store<fromEquipment.State>,
    private meterService: MeterService
  ) {
  }

}
