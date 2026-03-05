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
  state = {
    dragging: false,
    initialX: this.props.origin[0],
    initialY: this.props.origin[1],
    offsetX: 0,
    offsetY: 0,
    isLoading: true,
  };

  handleMouseDown = (e: {
    preventDefault: () => void;
    clientX: number;
    clientY: number;
  }) => {
    e.preventDefault();
    if (this.props.disableMove) return;
    if (!this.image) return;
    const { left, top } = this.image.getBoundingClientRect();
    this.setState({
      dragging: true,
      initialX: e.clientX,
      initialY: e.clientY,
      offsetX: e.clientX - left,
      offsetY: e.clientY - top,
    });
    window.addEventListener('mousemove', this.handleMouseMove);
    window.addEventListener('mouseup', this.handleMouseUp);
  };

  handleMouseMove = (e: { clientX: number; clientY: number }) => {
    if (this.state.dragging) {
      if (!this.image) return;
      const { offsetX, offsetY } = this.state;
      const x = e.clientX - offsetX;
      const y = e.clientY - offsetY;
      this.image.style.left = `${x}px`;
      this.image.style.top = `${y}px`;
    }
  };

  handleMouseUp = () => {
    this.setState({ dragging: false });
    window.removeEventListener('mousemove', this.handleMouseMove);
    window.removeEventListener('mouseup', this.handleMouseUp);
  };

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
