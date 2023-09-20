/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import {Component, OnDestroy, OnInit, Input} from '@angular/core';
import {NgbActiveModal, NgbDateParserFormatter, NgbModal} from '@ng-bootstrap/ng-bootstrap';
import {Store} from '@ngrx/store';
import {convertDateToISOString, convertNgbDateToDate, NgbDateFRParserFormatter} from '@shared-helpers';
import {MarkAsSubmittedAction, SetValueAction} from 'ngrx-forms';
import {Observable, Subscription} from 'rxjs';
import {map} from 'rxjs/operators';
import {EnterReadingsShowFilter, ReadingsValidationViewModel} from '../shared/models';
import * as enterReadingFormActions from './../shared/store/actions/enter-reading-form.actions';
import * as fromMeterReadings from './../shared/store/reducers';
import * as enterReadingFormState from './../shared/store/reducers/enter-reading-form.store';
import {OptionViewModel, ReadingSource} from '@app/shared/models';
import {PopupConfirmRolloverComponent} from "@app/popups/popup.confirm-rollover/popup.confirm-rollover.component";

import { BuildingPeriodViewModel } from '../../../shared/models/building-period.model';
import { NotificationService } from '@app/shared/services';
import { LocalStorageService } from 'angular-2-local-storage';

@Component({
  selector: 'enter-reading-popup',
  templateUrl: './enter-reading-popup.component.html',
  styleUrls: ['./enter-reading-popup.component.less'],
  providers: [{provide: NgbDateParserFormatter, useClass: NgbDateFRParserFormatter}]
})
export class EnterReadingPopupComponent implements OnInit, OnDestroy {
  @Input() isFromEquipment;
  @Input() readingDate;
  meterReadings$: Observable<any>;
  registerFiles$: Observable<any>;
  isSubmitted$: Subscription;
  locations$: Observable<OptionViewModel[]>;
  dateFormater$: Observable<any>;
  abnormalityStatusAndUsage$: Observable<any>;
  showFilter$: Observable<EnterReadingsShowFilter>;
  showFilterText$: Observable<string>;
  filterDateFormatter$: Observable<any>;
  readingsForDate$: Observable<ReadingsValidationViewModel[]>;
  enterReadingsShowFilter = EnterReadingsShowFilter;
  orderIndex = 1;
  trendUpValue = 20;
  trendDownValue = -20;
  subscription$: Subscription;
  rDate: any;

  readingDateValue: Date;
  selectedBuildingPeriod$: Subscription;
  buildingPeriod: BuildingPeriodViewModel;

  searchKey$: Observable<string>;
  searchLocation$: Observable<string>;

  constructor(
              private notificationService: NotificationService,
              private activeModal: NgbActiveModal,
              private store: Store<fromMeterReadings.State>,
              private modalService: NgbModal,
              private _localStorageService: LocalStorageService) {
    this.store.select(fromMeterReadings.getLatestBuildingPeriodShortModel).subscribe(bp => {
      var date = new Date(bp.endDate);
      if (this.readingDate != undefined) {
        date = new Date(this.readingDate);
      }
      this.store.dispatch(new enterReadingFormActions.ChangeFilterAsOfDate(date));
      this.store.dispatch(new enterReadingFormActions.RequestReadingsForDate({
        year: date.getFullYear(),
        month: date.getMonth() + 1,
        day: date.getDate(),
        readingSource: ReadingSource.ManualCapture
      }));
    });

    this.meterReadings$ = store.select(fromMeterReadings.getEnterReadingFormState);
    this.registerFiles$ = store.select(fromMeterReadings.getEnterReadingRegisterFiles);
    this.abnormalityStatusAndUsage$ = store.select(fromMeterReadings.getAbnormalityStatusAndUsage);
    this.showFilter$ = store.select(fromMeterReadings.getEnterReadingFormShowFilter);
    this.showFilterText$ = store.select(fromMeterReadings.getEnterReadingFormShowFilterText);
    this.searchKey$ = this.store.select(fromMeterReadings.getEnterReadingSearchKey);
    this.searchLocation$ = this.store.select(fromMeterReadings.getEnterReadingSearchLocation);
    this.locations$ = this.store.select(fromMeterReadings.getAllLocations);
    this.isSubmitted$ = store.select(fromMeterReadings.getEnterReadingFormIsSubmitted).subscribe(r => {
      if (r) {
        this.activeModal.close();
      }
    });

    this.dateFormater$ = store.select(fromMeterReadings.getEnterReadingFormState).pipe(map(form => {
      let date;
      if(this.rDate) {
        date = new Date(this.rDate);
      } else {
        date = new Date(form.value.date);
      }
      date = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
      this.readingDateValue = date;
      
      this.store.dispatch(new SetValueAction(enterReadingFormState.InitState.controls.date.id, date.toISOString()));

      return {year: date.getFullYear(), month: date.getMonth() + 1, day: date.getDate()};
    }));

    this.filterDateFormatter$ = store.select(fromMeterReadings.getEnterReadingFormShowFilterDate).pipe(map((date: string) => {
      const d = new Date(date);
      return {year: d.getFullYear(), month: d.getMonth() + 1, day: d.getDate()};
    }));

    this.readingsForDate$ = this.store.select(fromMeterReadings.getReadingsForDate);
  }


  ngOnInit(): void {
    this.store.dispatch(new enterReadingFormActions.ResetRegisterFiles());
    this.selectedBuildingPeriod$ = this.store.select(fromMeterReadings.getSelectedBuildingPeriod).subscribe(period => {
      this.buildingPeriod = period
    })
    if (this.readingDate != undefined) {
      this.rDate = this.readingDate;
    }
  }

  onDateChange(date): void {

    if (date) {
      const convertedDate = convertNgbDateToDate(date);
      this.store.dispatch(new SetValueAction(enterReadingFormState.InitState.controls.date.id, convertedDate.toISOString()));

      this.store.dispatch(new enterReadingFormActions.RequestReadingsForDate({
        year: convertedDate.getFullYear(),
        month: convertedDate.getMonth() + 1,
        day: convertedDate.getDate(),
        readingSource: ReadingSource.ManualCapture
      }));

      this.readingsForDate$ = this.store.select(fromMeterReadings.getReadingsForDate);
    }
  }

  ngOnDestroy(): void {
    this.isSubmitted$.unsubscribe();
    this.selectedBuildingPeriod$.unsubscribe();
  }

  onClose(): void {
    this.activeModal.dismiss();
    this.removeLocalStorageKeys();
  }

  onSave(): void {
    var inRange = (this.readingDateValue.getTime() >= new Date(this.buildingPeriod.startDate + '.000Z').getTime()) && (this.readingDateValue.getTime() <= new Date(this.buildingPeriod.endDate + '.000Z').getTime());
    if(!inRange) {  // check validation if reading date is in building period
      this.notificationService.error('Reading date should be between Building Period dates');
      return;
    }
    if(this.isFromEquipment) {
      let formValid = true;
      this.meterReadings$.subscribe((form) => {
        form.value.readings.forEach(reading => {
          reading.registers.forEach(register => {
            if(register.previousReadingValue == 0 && register.averageUsage == 0 && register.estimatedReadingValue == 0) formValid = true;
            else if(!register.currentReadingValue) formValid = false;
          })
        })
      })
      if (!formValid) {
        this.notificationService.error('Current Reading Value should not be empty!');
        return;
      }
    }
    this.removeLocalStorageKeys();
    this.store.dispatch(new enterReadingFormActions.SendReadingList());
    this.store.dispatch(new MarkAsSubmittedAction(enterReadingFormState.FORM_ID));
  }

  trackById(index, item): number {
    return index;
  }

  onEditNote($event): void {
    this.store.dispatch(new SetValueAction($event.id, $event.text));
  }

  onDeleteNote($event): void {
    this.store.dispatch(new SetValueAction($event, null));
  }

  onShowAllReadings(): void {
    this.store.dispatch(new enterReadingFormActions.ChangeFilterAsAllReadings());
  }

  onShowHasNoReadings(): void {
    this.store.dispatch(new enterReadingFormActions.ChangeFilterAsHasNoReadings());
  }

  onShowFilterDateChange(date): void {
    if (date) {
      date = convertNgbDateToDate(date);
      this.store.dispatch(new enterReadingFormActions.ChangeFilterAsOfDate(date.toISOString()));
    }
  }

  onRegisterFileChange($event): void {
    const file = $event.files[0] || null;

    this.store.dispatch(new enterReadingFormActions.UpdateRegisterFile(
      {
        meterId: $event.meterId,
        registerTouKey: $event.registerTouKey,
        file: file
      }));
  }

  isExistRegisterFile(registerFiles: any, meterId: any, registerTouKey: any): boolean {
    return registerFiles[meterId] ? !!registerFiles[meterId][registerTouKey] : false;
  }

  changeOrderIndex(): void {
    this.orderIndex *= -1;
  }

  getNotesLength(notes: string): number {
    return notes.length;
  }

  onBlurEvent(meterId: string, registerControl: any): void {
    this.subscription$ = this.abnormalityStatusAndUsage$.subscribe(x => {
      if (x[meterId][registerControl.value.registerTouKey].usage != null
        && x[meterId][registerControl.value.registerTouKey].usage < 0
        && registerControl.value.isRollover == null) {

        const modalRef = this.modalService.open(PopupConfirmRolloverComponent, {
          backdrop: 'static',
          windowClass: 'confirm-dialog-modal'
        });

        modalRef.result.then(
          () => {
            registerControl.value.isRollover = true;
            x[meterId][registerControl.value.registerTouKey].usage =
              fromMeterReadings.doRollover(registerControl.value.currentReadingValue, registerControl.value.previousReadingValue, registerControl.value.dialCount);
          },
          () => registerControl.value.isRollover = false
        );
      }
    });
    this.subscription$.unsubscribe();
  }

  removeLocalStorageKeys() {
    for (const key of this._localStorageService.keys()){
      if(key.indexOf('register_') > -1) this._localStorageService.remove(key);
    }
  }

  search(term: string): void {
    this.store.dispatch(new enterReadingFormActions.UpdateSearchKey(term));
  }

  onLocationChanged(locationId: string) {
    this.store.dispatch(new enterReadingFormActions.UpdateSearchLocation(locationId));
  }
}
