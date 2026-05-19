import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
@Entity('org_nodes')
export class OrgNode {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 200 })
  name: string;

  @Column({ type: 'int' })
  level: number;

  @Index()
  @Column({ nullable: true, type: 'int' })
  parentId: number | null;

  @ManyToOne(() => OrgNode, node => node.children, { nullable: true })
  @JoinColumn({ name: 'parentId' })
  parent: OrgNode;

  @OneToMany(() => OrgNode, node => node.parent)
  children: OrgNode[];

  @Index()
  @Column({ type: 'text', nullable: true })
  path: string | null;
}
