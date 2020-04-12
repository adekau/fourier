import { AfterViewInit, ChangeDetectionStrategy, ChangeDetectorRef, Component } from '@angular/core';
import * as M from 'mathjs';
import * as p5 from 'p5';
import { fromEvent } from 'rxjs';
import { debounceTime } from 'rxjs/operators';

import { FourierService } from './services/fourier.service';

@Component({
    selector: 'app-root',
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class AppComponent implements AfterViewInit {
    public pts: [number, number][] = [];
    public samples = 1024;
    public scalingFactor = 2;
    public reloading = false;

    private _timeFactor = 1;
    public get timeFactor() {
        return this._timeFactor;
    }
    public set timeFactor(newval: number) {
        this._timeFactor = newval;
        this.timing = ((2 * Math.PI) / this.pts.length) * this._timeFactor;
    }

    public svgUrl = './assets/llama.svg';
    public examples = [
        {
            name: 'Llama',
            url: './assets/llama.svg',
            speed: 1,
            samples: 400,
            scalingFactor: 2.5
        },
        {
            name: 'Happy',
            url: './assets/happy.svg',
            speed: 1,
            samples: 400,
            scalingFactor: 0.8
        }
    ];
    public timing: number = 0.04;

    private p5: p5;

    constructor(
        private cdr: ChangeDetectorRef,
        private fourierService: FourierService
    ) { }

    public async loadSvg() {
        this.reloading = true;
        this.reset();

        const response = await fetch(this.svgUrl);
        const text = await response.text();

        this.pts = await this.sampleSvgPoints(text, this.samples);
        const center = M.mean([M.min(this.pts), M.max(this.pts)]);
        this.pts = this.pts.map(([x, y]) => [
            (x - center) * this.scalingFactor,
            (y - center) * this.scalingFactor
        ]);
        this.timing = ((2 * Math.PI) / this.pts.length) * this.timeFactor;

        this.reloading = false;
        this.cdr.detectChanges();
    }

    private reset() {
        this.cdr.detectChanges();
        if (this.p5)
            this.p5.remove();
        this.p5 = null;
    }

    public resetScale() {
        this.pts = [];
        this.loadSvg();
    }

    public async ngAfterViewInit() {
        fromEvent(window, 'resize')
            .pipe(debounceTime(250))
            .subscribe({
                next: () => this.loadExample('Llama')
            });

        await this.loadExample('Llama');
    }

    private async sampleSvgPoints(xml: string, numPts: number): Promise<[number, number][]> {
        const parser = new DOMParser();
        const doc = parser.parseFromString(xml, 'application/xml');
        let samplePts = [];

        const paths = Array.from(doc.querySelectorAll('path'));
        const totalLength = paths.reduce((acc, v) => acc + v.getTotalLength(), 0);
        const step = (totalLength / numPts) + 0.0001;
        paths.forEach(path => {
            const sample = [];
            const n = M.floor(path.getTotalLength());
            for (let i = 0; i < n; i += step)
                sample.push(this.toPt(path.getPointAtLength(i)));
            samplePts = samplePts.concat(sample);
        });
        while (samplePts.length > numPts)
            samplePts.pop();

        return samplePts;
    }

    private toPt(pt: SVGPoint): [number, number] {
        return [pt.x, pt.y];
    }

    private parameterize(cn: M.Complex[]) {
        return async (t: number): Promise<M.Complex> => this.reloading
            ? M.complex('0')
            : await this.sigma(k =>
                M.multiply(M.complex(cn[k - 1].re, cn[k - 1].im), M.exp(M.multiply(M.i, (k - 1) * t))), [1, this.samples]) as M.Complex;
    }

    private async sigma(exp: (k: number) => M.MathType, interval: [number, number]): Promise<M.MathType> {
        let sum: M.MathType = 0;
        for (let i = interval[0]; i <= interval[1]; i++)
            sum = M.add(sum, exp(i));
        return sum;
    }

    public loadExample(exampleName: string) {
        const example = this.examples.find(e => e.name === exampleName);
        this.svgUrl = example.url;
        this.scalingFactor = example.scalingFactor;
        this.samples = example.samples;
        this.timeFactor = example.speed;
        this.loadSvg();
    }
}
