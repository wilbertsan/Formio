declare module 'js-clipper' {
  const ClipperLib: {
    ClipperOffset: new () => {
      AddPaths: (paths: Array<{ X: number; Y: number }[]>, joinType: number, endType: number) => void
      Execute: (solution: Array<{ X: number; Y: number }[]>, delta: number) => void
    }
    Clipper: (new () => {
      AddPaths: (paths: Array<{ X: number; Y: number }[]>, polyType: number, closed: boolean) => void
      Execute: (clipType: number, solution: Array<{ X: number; Y: number }[]>, fillType1: number, fillType2: number) => boolean
    }) & {
      PointInPolygon: (pt: { X: number; Y: number }, path: Array<{ X: number; Y: number }>) => number
      Area: (path: Array<{ X: number; Y: number }>) => number
    }
    PolyType: {
      ptSubject: number
      ptClip: number
    }
    ClipType: {
      ctUnion: number
      ctIntersection: number
      ctDifference: number
      ctXor: number
    }
    PolyFillType: {
      pftEvenOdd: number
      pftNonZero: number
      pftPositive: number
      pftNegative: number
    }
    JoinType: {
      jtRound: number
      jtSquare: number
      jtMiter: number
    }
    EndType: {
      etClosedPolygon: number
      etClosedLine: number
      etOpenRound: number
      etOpenSquare: number
      etOpenButt: number
    }
    Paths: new () => Array<{ X: number; Y: number }[]>
  }
  export default ClipperLib
}
