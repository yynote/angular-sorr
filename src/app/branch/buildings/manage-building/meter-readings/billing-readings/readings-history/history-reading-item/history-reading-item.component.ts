import {ReadingDetailsUpdateViewModel, ReadingFileInfoViewModel} from './../../shared/models/readings-history.model';
import {ReadingDetailsPopupMode} from '../../shared/models/reading-details-popup.model';
import {Component, EventEmitter, Input, OnInit, Output} from '@angular/core';
import {OptionViewModel, ReadingSource} from '@models';
import {ReadingsHistoryViewModel, shouldDisplayTime} from '../../shared/models/readings-history.model';


@Component({
  selector: 'history-reading-item',
  templateUrl: './history-reading-item.component.html',
  styleUrls: ['./history-reading-item.component.less']
})

export class HistoryReadingItemComponent implements OnInit {
  @Input() reading: ReadingsHistoryViewModel;
  @Input() pinnedReading = false;
  @Input() reasons: OptionViewModel[];
  @Output() togglePin = new EventEmitter();
  @Output() setBilling = new EventEmitter();
  @Output() updateReadingsList = new EventEmitter();
  @Output() readingDetailsUpdate = new EventEmitter<ReadingDetailsUpdateViewModel>();
  @Output() readingDetailsFileDownload = new EventEmitter<ReadingFileInfoViewModel>();
  readingSource = ReadingSource;
  readingStatus: string;
  pinStatus: string;
  defaultReadingUrl = 'assets/images/meter-readings/meter-reading-icon.svg';
  readingImgSrc: string;
  audioPlayback = false;
  shouldDisplayTime = shouldDisplayTime;
  audioRecord = '';
  isBilling: boolean;
  readingDetailsPopupMode = ReadingDetailsPopupMode;
  private readonly ESTIMATE = 'Estimate';
  private audio: any;

  constructor() {
  }

  ngOnInit() {
    this.getReadingStatus(this.reading);
    this.getPinStatus(this.reading.isPinned);
    this.getReadingImgSrc(this.reading.photoUrl);
  }

  getReadingStatus(reading: ReadingsHistoryViewModel) {
    if (reading.readingSource === this.readingSource['Estimate']) {
      this.readingStatus = 'Estimated';
    }

    if (reading.confirmed && reading.readingSource != this.readingSource[this.ESTIMATE]) {
      this.readingStatus = 'Confirmed';
    }


    if (!reading.confirmed && reading.readingSource != this.readingSource[this.ESTIMATE]) {
      this.readingStatus = 'Unconfirmed';
    }

  }

  getReadingImgSrc(src) {
    if (src) {
      this.readingImgSrc = src;
    } else {
      this.readingImgSrc = this.defaultReadingUrl;
    }
  }

  getPinStatus(isPinned: boolean) {
    (isPinned) ? this.pinStatus = 'Unpin' : this.pinStatus = 'Pin';
  }

  onTogglePin() {
    const model = {
      reading: this.reading,
      readingId: this.reading.id,
      meterId: this.reading.meterId,
      registerId: this.reading.registerId,
      buildingPeriodId: this.reading.buildingPeriodId,
      isPinned: !this.reading.isPinned
    };
    this.togglePin.emit(model);
  }

  onUpdateReadingsList($event) {
    this.updateReadingsList.emit($event);
  }

  onSetBilling(reading: ReadingsHistoryViewModel) {
    this.setBilling.emit({readingId: reading.id, buildingId: reading.buildingId});
  }
}
