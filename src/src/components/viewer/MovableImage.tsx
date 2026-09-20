import { Skeleton } from '@/components/ui/skeleton';
import { Component } from 'react';

interface MovableImageProps {
  src: string;
  alt: string;
  id: string;
  origin: number[];
  width: number | string;
  height: number | string;
  rotation: number;
  disableMove: boolean;
  center?: boolean;
}
class MovableImage extends Component<MovableImageProps> {
  image: HTMLImageElement | null = null;
  drag: { mouseX: number; mouseY: number; left: number; top: number } | null =
    null;
  state = {
    isLoading: true,
  };

  componentWillUnmount() {
    this.stopDragging();
  }

  handleMouseDown = (e: {
    preventDefault: () => void;
    clientX: number;
    clientY: number;
  }) => {
    e.preventDefault();
    if (this.props.disableMove) return;
    if (!this.image) return;
    this.drag = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      left: this.image.offsetLeft,
      top: this.image.offsetTop,
    };
    window.addEventListener('mousemove', this.handleMouseMove);
    window.addEventListener('mouseup', this.handleMouseUp);
  };

  handleMouseMove = (e: { clientX: number; clientY: number }) => {
    if (!this.drag || !this.image) return;
    const { mouseX, mouseY, left, top } = this.drag;
    this.image.style.left = `${left + e.clientX - mouseX}px`;
    this.image.style.top = `${top + e.clientY - mouseY}px`;
  };

  handleMouseUp = () => {
    this.stopDragging();
  };

  stopDragging() {
    this.drag = null;
    window.removeEventListener('mousemove', this.handleMouseMove);
    window.removeEventListener('mouseup', this.handleMouseUp);
  }

  render() {
    return (
      <>
        <img
          ref={(img) => {
            this.image = img;
          }}
          src={this.props.src}
          alt={this.props.alt}
          id={this.props.id}
          style={{
            position: 'absolute',
            left: this.props.center ? '50%' : this.props.origin[0],
            top: this.props.origin[1],
            cursor: 'move',
            width: this.props.width,
            height: this.props.height,
            objectFit: 'contain',
            transform: this.props.center
              ? `translateX(-50%) rotate(${this.props.rotation}deg)`
              : `rotate(${this.props.rotation}deg)`,
            opacity: this.state.isLoading ? 0 : 1,
          }}
          onMouseDown={this.handleMouseDown}
          onError={(e: any) => {
            e.target.src = 'Images/fileDefault.webp';
          }}
          onLoad={() => {
            this.setState({ isLoading: false });
          }}
          onChange={() => {
            this.setState({ isLoading: true });
          }}
        />
        {this.state.isLoading ? (
          <Skeleton
            className="absolute"
            style={{
              left: this.props.origin[0],
              top: this.props.origin[1],
              width: window.innerWidth / 3 - 20,
              height: window.innerHeight - 100,
            }}
          />
        ) : (
          <></>
        )}
      </>
    );
  }
}

export default MovableImage;
