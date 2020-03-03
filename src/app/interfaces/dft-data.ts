import * as M from 'mathjs';

export type DFTData = M.Complex & {
    freq: number;
    radius: number;
    phase: number;
}
