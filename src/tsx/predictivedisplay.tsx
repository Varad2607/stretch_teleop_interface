import React from "react"
import { SVG_RESOLUTION, percent2Pixel, OVERHEAD_ROBOT_BASE as BASE } from "../util/svg";
import { navigationProps } from "../util/util";
import "../css/predictivedisplay.css"

/**
 * Scales height values to fit in the navigation camera
 * @param y the number to scale
 * @returns scaled number
 */
const scaleToNavAspectRatio = (y: number) => {
    return y / navigationProps.width * navigationProps.height;
}

/**Arguments for drawing the dashed line in the center of the path */
const strokeDasharray = "4 10"
/**Height of the predictive display SVG */
const resolution_height = scaleToNavAspectRatio(SVG_RESOLUTION)
/**Pixel location of the front of the robot */
const baseFront = scaleToNavAspectRatio(BASE.centerY - BASE.height / 2);
/**Pixel location of the back of the robot */
const baseBack = scaleToNavAspectRatio(BASE.centerY + BASE.height / 2);
/**Y pixel position of the center of the base */
const baseCenterY = scaleToNavAspectRatio(BASE.centerY);
/**Left side of the robot */
const baseLeft = BASE.centerX - BASE.width / 2;
/**Right side of the robot */
const baseRight = BASE.centerX + BASE.width / 2;
/**Radius around the base of the rotation arrows */
const rotateArcRadius = percent2Pixel(10);

/**Formats the SVG path arc string. */
function makeArc(startX: number, startY: number, radius: number, sweepFlag: boolean, endX: number, endY: number) {
    const sweep = sweepFlag ? 1 : 0;
    return `M ${startX},${startY} A ${radius} ${radius} 0 0 ${sweep} ${endX},${endY}`
}

/** Properties for the PredictiveDisplay component */
interface PredictiveDisplayProps {
    /** Callback function when mouse is clicked in predicitive display area */
    onClick: (length: number, angle: number) => void;
    /** Callback function when cursor is moved in predictive display area */
    onMove?: (length: number, angle: number) => void;
    /** Callback function for release, also called when the user exits the 
     * predictive display area
     */
    onRelease?: () => void;
}

/** State for the PredicitiveDisplay component */
interface PredictiveDisplayState {
    /** Components to render to display the trajectory. */
    trajectory: React.ReactNode;
}

/**
 * Creates the SVG path elements for circular arrows around the base.
 * @param rotateLeft if true draws a path counter-clockwise, otherwise clockwise
 * @returns SVG path string description of the arrows
 */
const makeArrowPath = (rotateLeft: boolean) => {
    const arrowLength = percent2Pixel(2.5);
    const top = baseCenterY - rotateArcRadius;
    const bottom = baseCenterY + rotateArcRadius;
    const left = BASE.centerX - rotateArcRadius;
    const right = BASE.centerX + rotateArcRadius;
    const arrowDx = rotateLeft ? arrowLength : -arrowLength;

    let arrows = makeArc(rotateLeft ? right : left, baseCenterY, rotateArcRadius, !rotateLeft, BASE.centerX, top)
    arrows += `L ${BASE.centerX + arrowDx} ${top - arrowLength}`

    arrows += makeArc(rotateLeft ? left : right, baseCenterY, rotateArcRadius, !rotateLeft, BASE.centerX, bottom)
    arrows += `L ${BASE.centerX - arrowDx} ${bottom + arrowLength}`
    return arrows
}

/** Path to draw for turning left in place */
const leftArrowPath: string = makeArrowPath(true);
/** Path to draw for turning right in place */
const rightArrowPath: string = makeArrowPath(false);

export class PredictiveDisplay extends React.Component<PredictiveDisplayProps, PredictiveDisplayState> {
    svgRef: React.RefObject<SVGSVGElement>;

    constructor(props: PredictiveDisplayProps) {
        super(props);
        this.state = {
            trajectory: undefined
        }
        this.svgRef = React.createRef();
        this.onMouseMove = this.onMouseMove.bind(this);
        this.onMouseLeave = this.onMouseLeave.bind(this);
        this.drawForwardTraj = this.drawForwardTraj.bind(this);
        this.drawRotate = this.drawRotate.bind(this);
        this.drawBackward = this.drawBackward.bind(this);
    }

    /**
     * Draws an arc from the base to the cursor, such that the arc is normal
     * to the base.
     * @param x horizontal position of the cursor
     * @param y vertical position of the cursor
     */
    drawForwardTraj(x: number, y: number): [number, number] {
        const dx = BASE.centerX - x;
        const dy = baseFront - y;
        const heading = Math.atan2(-dx, dy)
        const sweepFlag = dx < 0;

        const c = Math.sqrt(dx * dx + dy * dy)  // length from base to cursor
        const radius = c / (2 * Math.sin(heading))  // radius of the center curve
        const centerPath = makeArc(BASE.centerX, baseFront, radius, sweepFlag, x, y);

        // Next to base, draw rotate trajectory. 
        // note: this handles the case where the cursor is too close to the base
        // of the robot for the robot to achieve that position with only forward
        // wheel spin
        if (Math.abs(radius) < BASE.width / 2) {
            return this.drawRotate(x < BASE.centerX);
        }

        const leftEndX = x - BASE.width / 2 * Math.cos(2 * heading)
        const leftEndY = y - BASE.width / 2 * Math.sin(2 * heading)
        const leftRadius = radius + BASE.width / 2
        const leftPath = makeArc(baseLeft, baseFront, leftRadius, sweepFlag, leftEndX, leftEndY);

        const rightEndX = x + BASE.width / 2 * Math.cos(2 * heading)
        const rightEndY = y + BASE.width / 2 * Math.sin(2 * heading)
        const rightRadius = radius - BASE.width / 2
        const rightPath = makeArc(baseRight, baseFront, rightRadius, sweepFlag, rightEndX, rightEndY);

        const trajectory = (
            <>
                <path d={centerPath} style={{ strokeDasharray: strokeDasharray }} />
                <path d={leftPath} />
                <path d={rightPath} />
            </>
        );
        this.setState({ trajectory });
        const arcLength = 2 * radius * heading;
        return [arcLength, heading];
    }

    /**
     * Draws circular arrows around the base for rotating in place
     * @param rotateLeft if true draws counterclockwise arrow, if false draws 
     * clockwise
     */
    drawRotate(rotateLeft: boolean): [number, number] {
        const path = rotateLeft ? leftArrowPath : rightArrowPath;
        const trajectory = (
            <path d={path} />
        );
        this.setState({ trajectory })
        return [0, -1]  // TODO: map rotate click to angular velocity
    }

    /**
     * Draws a straigh path backward from the base to the y position of the mouse
     * @param y y position of the mouse on the SVG canvas
     * @returns length and angle of the click
     */
    drawBackward(y: number): [number, number] {
        const leftPath = `M ${baseLeft} ${baseBack} ${baseLeft} ${y}`
        const rightPath = `M ${baseRight} ${baseBack} ${baseRight} ${y}`
        const centerPath = `M ${BASE.centerX} ${baseBack} ${BASE.centerX} ${y}`
        const trajectory = (
            <>
                <path d={centerPath} style={{ strokeDasharray: strokeDasharray }} />
                <path d={leftPath} />
                <path d={rightPath} />
            </>
        );
        this.setState({ trajectory })
        return [baseBack - y, 0];
    }

    /** Updates the trajectory display and calls callback.*/
    onMouseMove(event: React.MouseEvent<SVGSVGElement>, click?: boolean) {
        const { clientX, clientY } = event;
        const svg = this.svgRef.current;
        if (!svg) return;
        const rect = svg.getBoundingClientRect();
        // Get x and y in terms of the SVG element
        const x = (clientX - rect.left) / rect.width * SVG_RESOLUTION;
        const pixelY = (clientY - rect.top) / rect.height;
        const y = scaleToNavAspectRatio(pixelY * SVG_RESOLUTION);

        let ret: [number, number];
        if (y < baseFront) {
            ret = this.drawForwardTraj(x, y)
        } else if (y < baseBack) {
            // Next to base, draw rotate trajectory
            ret = this.drawRotate(x < BASE.centerX);
        } else {
            // Move backward
            ret = this.drawBackward(y);
        }

        const [length, angle] = ret;
        // Call the passed in move callback function
        if (!click && this.props.onMove) {
            this.props.onMove(length, angle);
            // Or call the passed in click callback
        } else if (click && this.props.onClick) {
            this.props.onClick(length, angle);
        }
    }

    /**Executed when the mouse leaves the predictive display. */
    onMouseLeave() {
        this.setState({ trajectory: undefined });
        if (this.props.onRelease) {
            this.props.onRelease()
        }
    }

    render() {
        return (
            <svg
                viewBox={`0 0 ${SVG_RESOLUTION} ${resolution_height}`}
                preserveAspectRatio="none"
                ref={this.svgRef}
                onMouseMove={this.onMouseMove}
                onMouseLeave={this.onMouseLeave}
                className="predictive-display"
                onClick={(e) => this.onMouseMove(e, true)}
            >
                {this.state.trajectory}
            </svg>
        )
    }
}